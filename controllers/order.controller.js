import Order from "../models/order.module.js";
import User from "../models/user.module.js";
import Product from "../models/products.module.js";
import stockHistory from "../models/stockHistory.module.js";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const currency = 'pkr';
const deliveryCharges = 200;
const taxRate = 0.05;

const placeOrderCOD = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items, amount, address } = req.body;

        for (const item of items) {
            const product = await Product.findById(item._id);
            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.title}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${product.title}` });
            }
        }

        const orderData = {
            userId,
            items,
            amount,
            address,
            paymentMethod: "COD",
            payment: false,
            date: Date.now()
        };

        const newOrder = new Order(orderData);
        await newOrder.save();

        for (const item of items) {
            const product = await Product.findById(item._id);

            if (!product || product.stock < item.quantity) {
                await Order.findByIdAndDelete(newOrder._id);
                return res.status(400).json({
                    success: false,
                    message: `Not enough stock for product: ${product?.title || item._id}`,
                });
            }

            const previousStock = product.stock;
            product.stock -= item.quantity;
            const newStock = product.stock;
            await product.save();

            await stockHistory.create({
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

        await User.findByIdAndUpdate(userId, { cartData: {} });

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
        const userId = req.user.id;
        const { items, amount, address } = req.body;
        const { origin } = req.headers;

        for (const item of items) {
            const product = await Product.findById(item._id);
            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.title}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${product.title}` });
            }
        }

        const subtotal = amount;
        const tax = subtotal * taxRate;


        const orderTotal = subtotal + deliveryCharges + tax;


        const orderData = {
            userId,
            items,
            amount: orderTotal,
            address,
            paymentMethod: "Stripe",
            payment: false,
            date: Date.now()
        };

        const newOrder = new Order(orderData);
        await newOrder.save();


        const line_items = items.map((item) => ({
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
                unit_amount: tax * 100,
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
    const userId = req.user.id;
    const { success, orderId } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (success === "true" || success === true) {
            for (const item of order.items) {
                const product = await Product.findById(item._id);

                if (!product) {
                    await Order.findByIdAndDelete(orderId);
                    return res.status(404).json({
                        message: `Product not found: ${item.title}`
                    });
                }

                if (product.stock < item.quantity) {
                    await Order.findByIdAndDelete(orderId);
                    return res.status(400).json({
                        message: `Not enough stock for ${product.title}`
                    });
                }

                const previousStock = product.stock;
                product.stock -= item.quantity;
                const newStock = product.stock;
                await product.save();

                await stockHistory.create({
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

            await Order.findByIdAndUpdate(orderId, { payment: true });
            await User.findByIdAndUpdate(userId, { cartData: {} });

            res.json({
                success: true,
                message: 'Payment verified successfully'
            });
        } else {
            await Order.findByIdAndDelete(orderId);
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
        const userId = req.user.id;

        const orders = await Order.find({
            userId,
            $or: [{ paymentMethod: "COD" }, { payment: true }]
        }).sort({ createdAt: -1 });

        res.status(200).json({ orders });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.body;

        const order = await Order.findById(orderId);

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

        for (const item of order.items) {
            const product = await Product.findById(item._id);

            if (product) {
                const previousStock = product.stock;
                product.stock += item.quantity;
                const newStock = product.stock;
                await product.save();

                await stockHistory.create({
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

        order.status = "cancelled";
        await order.save();

        res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            order
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