import Order from "../models/order.module.js";
import User from "../models/user.module.js";
import Product from "../models/products.module.js";
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const currency = 'pkr'
const deliveryCharges = 200
const taxRate = 0.05

const placeOrderCOD = async (req, res) => {
    try {
        const userId = req.user.id
        const { items, amount, address } = req.body;

        // Step 1: Check stock for all items
        for (const item of items) {
            const product = await Product.findById(item._id);
            if (!product) return res.status(404).json({ message: `Product not found: ${item.title}` });
            if (product.stock < item.quantity)
                return res.status(400).json({ message: `Not enough stock for ${product.title}` });
        }

        // Step 2: Decrement stock safely
        for (const item of items) {
            const product = await Product.findById(item._id);

            // Prevent negative stock
            if (!product || product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Not enough stock for product: ${product?.name || item._id}`,
                });
            }

            product.stock -= item.quantity;
            await product.save();
        }


        const orderData = {
            userId,
            items,
            amount,
            address,
            paymentMethod: "COD",
            payment: false,
            date: Date.now()
        }

        const newOrder = new Order(orderData);
        await newOrder.save();

        await User.findByIdAndUpdate(userId, { cartData: {} })

        res.status(200).json({ message: "Order placed successfully" })

    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }
}

const placeOrderStripe = async (req, res) => {
    try {
        const userId = req.user.id
        const { items, amount, address } = req.body
        console.log(amount)
        const { origin } = req.headers

        // Step 1: Check stock for all items
        for (const item of items) {
            const product = await Product.findById(item._id);
            if (!product) return res.status(404).json({ message: `Product not found: ${item.title}` });
            if (product.stock < item.quantity)
                return res.status(400).json({ message: `Not enough stock for ${product.title}` });
        }

        const orderData = {
            userId,
            items,
            amount,
            address,
            paymentMethod: "Stripe",
            payment: false,
            date: Date.now()
        }

        const newOrder = new Order(orderData);
        await newOrder.save();

        const subtotal = amount;
        const tax = Math.round(subtotal * taxRate);
        
        const line_items = items.map((item) => ({
            price_data: {
                currency,
                product_data: {
                    name: item.title,
                },
                unit_amount: item.price * 100,
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data: {
                currency,
                product_data: {
                    name: "Delivery Charges",
                },
                unit_amount: deliveryCharges * 100,
            },
            quantity: 1
        })
         line_items.push({
            price_data: {
                currency,
                product_data: {
                    name: "Tax (5%)",
                },
                unit_amount: tax * 100,
            },
            quantity: 1
        })

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment'
        })

        res.status(200).json({ session_url: session.url })

    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }
}


const verifyStripe = async (req, res) => {
    const userId = req.user.id
    const { success, orderId } = req.body

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (success === "true" || success === true) {
            // Decrement stock for each item ONLY on successful payment
            for (const item of order.items) {
                const product = await Product.findById(item._id);

                if (!product) {
                    // Rollback: delete order if product not found
                    await Order.findByIdAndDelete(orderId);
                    return res.status(404).json({
                        message: `Product not found: ${item.title}`
                    });
                }

                if (product.stock < item.quantity) {
                    // Rollback: delete order if insufficient stock
                    await Order.findByIdAndDelete(orderId);
                    return res.status(400).json({
                        message: `Not enough stock for ${product.title}`
                    });
                }

                product.stock -= item.quantity;
                await product.save();
            }
            await Order.findByIdAndUpdate(orderId, { payment: true });
            await User.findByIdAndUpdate(userId, { cartData: {} })
            res.json({ success: true, message: 'Payment verified successfully' })
        }
        else {
            await Order.findByIdAndDelete(orderId);
            res.json({ success: false, message: 'Payment cancelled or failed' })
        }

    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }
}


// const allOrder = async (req, res) => {
//     try {
//         const orders = await Order.find({})
//         res.status(200).json({ orders })
//     }
//     catch (err) {
//         res.status(500).json({ message: err.message })
//     }
// }


const getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id;

        // const orders = await Order.find({ userId })
        // res.status(200).json({ orders })

        const orders = await Order.find({
            userId,
            $or: [{ paymentMethod: "COD" }, { payment: true }]
        }).populate("items.product address").sort({ createdAt: -1 });
        res.status(200).json({ orders });
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }
}

const cancelOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.body;
        console.log(orderId)

        // Find the order
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if order belongs to the user
        if (order.userId.toString() !== userId) {
            return res.status(403).json({ message: "Unauthorized to cancel this order" });
        }

        // Check if order status is "Pending" (only pending orders can be cancelled)
        if (order.status !== "pending") {
            return res.status(400).json({
                message: `Cannot cancel order with status: ${order.status}`
            });
        }

        // Restore stock for each item in the order
        for (const item of order.items) {
            const product = await Product.findById(item._id);
            if (product) {
                product.stock += item.quantity;
                await product.save();
            }
        }

        // Update order status to "Cancelled"
        order.status = "cancelled";
        await order.save();

        res.status(200).json({
            message: "Order cancelled successfully",
            order
        });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
}


export { placeOrderCOD, placeOrderStripe, getUserOrders, verifyStripe, cancelOrder }