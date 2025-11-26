import User from "../models/user.module.js";
import Product from "../models/products.module.js";

import mongoose from "mongoose";

const getUserCart = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("cartData");
        const cartData = user.cartData || {};

        // Step 1: Get only valid ObjectId keys
        const productIds = Object.keys(cartData).filter(id => mongoose.Types.ObjectId.isValid(id));

        // Step 2: Query only valid product IDs
        const products = await Product.find({ _id: { $in: productIds } }).select("title price image");

        // Step 3: Merge quantity from cartData
        const cartArray = products.map(product => ({
            _id: product._id,
            quantity: cartData[product._id],
            title: product.title,
            price: product.price,
            image: product.image
        }));

        res.json({ success: true, cartData: cartArray });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
};


const modifyCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, action } = req.body;

        if (!itemId || !action) {
            return res.status(400).json({ error: true, message: "itemId and action are required" });
        }

        const product = await Product.findById(itemId);

        const user = await User.findById(userId);
        const currentQty = user.cartData[itemId] || 0;

        if (action === "add") {

            if (product.stock <= 0) {
                return res.status(400).json({ message:"item is out of stock" });
            }
            const newQty = currentQty + 1;
            await User.findByIdAndUpdate(
                userId,
                { $set: { [`cartData.${itemId}`]: newQty } }
            );
            return res.json({ success: true, message: "Item added", quantity: newQty });
        }

        if (action === "subtract") {
            if (currentQty <= 1) {
                await User.findByIdAndUpdate(userId, { $unset: { [`cartData.${itemId}`]: "" } });
                return res.json({ success: true, message: "Item removed from cart" });

            } else {
                const newQty = currentQty - 1;
                await User.findByIdAndUpdate(userId, { $set: { [`cartData.${itemId}`]: newQty } });
                return res.json({ success: true, message: "Item quantity decreased", quantity: newQty });
            }
        }

        res.json({ error: true, message: "Invalid action" });

    } catch (err) {
        res.json({ error: true, message: err.message });
    }
};

const removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;

        if (!itemId) {
            return res.json({ error: true, message: "itemId is required" });
        }

        await User.findByIdAndUpdate(
            userId,
            { $unset: { [`cartData.${itemId}`]: "" } }
        );

        res.json({ success: true, message: "Item removed from cart" });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
};

export { getUserCart, modifyCart, removeFromCart };
