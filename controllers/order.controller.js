import Order from "../models/order.module.js";
import User from "../models/user.module.js";
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const currency = 'pkr'
const deliveryCharges = 10

const placeOrderCOD = async (req, res) => {
    try {
        const userId = req.user.id
        const { items, amount, address } = req.body;

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

        res.status(200).json({ message: "Order placed" })

    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }
}

const placeOrderStripe = async (req, res) => {
    try {
        const userId = req.user.id
        const { items, amount, address } = req.body
        const { origin } = req.headers


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
        if (success == "true") {
            await Order.findByIdAndUpdate(orderId, { payment: true });
            await User.findByIdAndUpdate(userId, { cartData: {} })
            res.json({ success: true })
        }
        else {
            await Order.findByIdAndUpdate(orderId);
            res.json({ success: false })
        }

    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }
}


const allOrder = async (req, res) => {
    try {
        const orders = await Order.find({})
        res.status(200).json({ orders })
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }
}


const userOrders = async (req, res) => {
    try {
        const userId = req.user.id;

        const orders = await Order.find({ userId })
        res.status(200).json({ orders })
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }
}


export { placeOrderCOD, placeOrderStripe, allOrder, userOrders, verifyStripe }

