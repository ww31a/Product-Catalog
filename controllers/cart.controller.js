import User from "../models/user.module.js";
import Product from "../models/products.module.js";

const getUserCart = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("cartData");
        const cartData = user.cartData || {};

        const productIds = Object.keys(cartData);
        const products = await Product.find({ _id: { $in: productIds } }).select("title price image");

        const cartArray = products.map(product => ({
            _id: product._id,
            quantity: cartData[product._id],
            title: product.title,
            price: product.price,
            image: product.image
        }));

        res.json({ success: true, cartData: cartArray });
    } catch (err) {
        console.log(err);
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

        const user = await User.findById(userId);
        const currentQty = user.cartData[itemId] || 0;

        if (action === "add") {
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

        res.json({ error: false, message: "Invalid action" });

    } catch (err) {
        console.log(err);
        res.json({ error: true, message: err.message });
    }
};

const removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;

        if (!itemId) {
            return res.json({ error: false, message: "itemId is required" });
        }

        await User.findByIdAndUpdate(
            userId,
            { $unset: { [`cartData.${itemId}`]: "" } }
        );

        res.json({ success: true, message: "Item removed from cart" });
    } catch (err) {
        console.log(err);
        res.json({ error: true, message: err.message });
    }
};

export { getUserCart, modifyCart, removeFromCart };
