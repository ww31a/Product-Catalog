import Stripe from 'stripe';
import OrderService from "../services/order.service.js";
import UserService from "../services/user.service.js";
import ProductService from "../services/product.service.js";
import StockHistoryService from "../services/stockHistory.service.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const currency = 'pkr';
const deliveryCharges = 200;
const taxRate = 0.05;

const placeOrderCOD = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { items, amount, address } = req.body;

        // Validate stock availability and enrich items with sellerId
        const enrichedItems = [];
        for (const item of items) {
            const product = await ProductService.findById(item._id);
            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.title}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${product.title}` });
            }

            // Attach sellerId so frontend can open chat with seller per item
            enrichedItems.push({
                ...item,
                sellerId: product.owner?.toString() || product.owner
            });
        }

        const orderData = {
            userId,
            items: enrichedItems,
            amount,
            address,
            paymentMethod: "COD",
            payment: false,
            date: Date.now()
        };

        const newOrder = await OrderService.create(orderData);

        // Process stock reduction and history
        for (const item of enrichedItems) {
            const product = await ProductService.findById(item._id);

            if (!product || product.stock < item.quantity) {
                await OrderService.delete(newOrder._id);
                return res.status(400).json({
                    success: false,
                    message: `Not enough stock for product: ${product?.title || item._id}`,
                });
            }

            const previousStock = product.stock;
            await ProductService.decrementStock(product._id, item.quantity);
            const newStock = previousStock - item.quantity;

            await StockHistoryService.create({
                productId: product._id,
                previousStock,
                newStock,
                change: -item.quantity,
                type: "remove",
                reason: "sale",  
                changedBy: product.owner,  
                orderId: newOrder.orderId,
                notes: `Stock reduced for COD order ${newOrder.orderId}`
            });
        }

        await UserService.clearCart(userId);

        res.status(200).json({
            success: true,
            message: "Order placed successfully",
            orderId: newOrder._id
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const placeOrderStripe = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { items, amount, address } = req.body;
        const { origin } = req.headers;

        // Validate stock availability and enrich items with sellerId
        const enrichedItems = [];
        for (const item of items) {
            const product = await ProductService.findById(item._id);
            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.title}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${product.title}` });
            }

            enrichedItems.push({
                ...item,
                sellerId: product.owner?.toString() || product.owner
            });
        }

        const subtotal = amount;
        const tax = subtotal * taxRate;
        const orderTotal = subtotal + deliveryCharges + tax;

        const orderData = {
            userId,
            items: enrichedItems,
            amount: orderTotal,
            address,
            paymentMethod: "Stripe",
            payment: false,
            date: Date.now()
        };

        const newOrder = await OrderService.create(orderData);

        // Build Stripe line items
        const line_items = enrichedItems.map((item) => ({
            price_data: {
                currency,
                product_data: {
                    name: item.title,
                },
                unit_amount: item.price * 100,
            },
            quantity: item.quantity
        }));

        line_items.push({
            price_data: {
                currency,
                product_data: {
                    name: "Delivery Charges",
                },
                unit_amount: deliveryCharges * 100,
            },
            quantity: 1
        });

        line_items.push({
            price_data: {
                currency,
                product_data: {
                    name: "Tax (5%)",
                },
                unit_amount: Math.round(tax * 100),
            },
            quantity: 1
        });

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment'
        });

        res.status(200).json({ session_url: session.url });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const verifyStripe = async (req, res) => {
    const userId = req.auth.userId;
    const { success, orderId } = req.body;

    try {
        const order = await OrderService.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (success === "true" || success === true) {
            // Process stock reduction
            for (const item of order.items) {
                const product = await ProductService.findById(item._id);

                if (!product) {
                    await OrderService.delete(orderId);
                    return res.status(404).json({
                        message: `Product not found: ${item.title}`
                    });
                }

                if (product.stock < item.quantity) {
                    await OrderService.delete(orderId);
                    return res.status(400).json({
                        message: `Not enough stock for ${product.title}`
                    });
                }

                const previousStock = product.stock;
                await ProductService.decrementStock(product._id, item.quantity);
                const newStock = previousStock - item.quantity;

                await StockHistoryService.create({
                    productId: product._id,
                    previousStock,
                    newStock,
                    change: -item.quantity,
                    type: "remove",
                    reason: "sale",  
                    changedBy: product.owner,
                    orderId: order.orderId,
                    notes: `Stock reduced for Stripe order ${order.orderId} (payment confirmed)`
                });
            }

            await OrderService.updatePaymentStatus(orderId, true);
            await UserService.clearCart(userId);

            res.json({
                success: true,
                message: 'Payment verified successfully'
            });
        } else {
            await OrderService.delete(orderId);
            res.json({
                success: false,
                message: 'Payment cancelled or failed'
            });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getUserOrders = async (req, res) => {
    try {
        const userId = req.auth.userId;

        const orders = await OrderService.findAll({
            userId,
            $or: [{ paymentMethod: "COD" }, { payment: true }]
        });

        // Ensure each item has sellerId (for older orders created before this field was stored)
        const productOwnerCache = new Map();

        const enrichedOrders = [];
        for (const order of orders) {
            const enrichedItems = [];

            for (const item of order.items) {
                // If sellerId already present, keep as is
                if (item.sellerId) {
                    enrichedItems.push(item);
                    continue;
                }

                const productId = item._id?.toString();
                if (!productId) {
                    enrichedItems.push(item);
                    continue;
                }

                // Try cache first
                let ownerId = productOwnerCache.get(productId);

                if (!ownerId) {
                    const product = await ProductService.findById(productId);
                    if (product) {
                        ownerId = product.owner?.toString() || product.owner;
                        productOwnerCache.set(productId, ownerId);
                    }
                }

                enrichedItems.push({
                    ...item.toObject?.() ? item.toObject() : item,
                    sellerId: ownerId || item.sellerId
                });
            }

            enrichedOrders.push({
                ...order.toObject(),
                items: enrichedItems
            });
        }

        res.status(200).json({ orders: enrichedOrders });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { orderId } = req.body;

        const order = await OrderService.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.userId.toString() !== userId) {
            return res.status(403).json({ message: "Unauthorized to cancel this order" });
        }

        if (order.status !== "pending") {
            return res.status(400).json({
                message: `Cannot cancel order with status: ${order.status}`
            });
        }

        // Restore stock
        for (const item of order.items) {
            const product = await ProductService.findById(item._id);

            if (product) {
                const previousStock = product.stock;
                await ProductService.incrementStock(product._id, item.quantity);
                const newStock = previousStock + item.quantity;

                await StockHistoryService.create({
                    productId: product._id,
                    previousStock,
                    newStock,
                    change: item.quantity,
                    type: "add",
                    reason: "return", 
                    changedBy: product.owner,
                    orderId: order.orderId,
                    notes: `Stock restored - Order ${order.orderId} cancelled by customer`
                });
            }
        }

        const updatedOrder = await OrderService.updateStatus(order._id, "cancelled");

        res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            order: updatedOrder
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export {
    placeOrderCOD,
    placeOrderStripe,
    getUserOrders,
    verifyStripe,
    cancelOrder
};