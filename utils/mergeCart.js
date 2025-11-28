// utilities/cart.utils.js
import User from "../models/user.module.js";
import Product from "../models/products.module.js";
import mongoose from "mongoose";

export const mergeGuestCartIntoUserCart = async (userId, guestCart) => {
    const user = await User.findById(userId);

    if (!user) throw new Error("User not found");

    const existingCart = user.cartData || {};

    // Ensure guestCart is an array
    if (!Array.isArray(guestCart)) return user;

    for (const item of guestCart) {
        const productId = item._id;
        const guestQuantity = Number(item.quantity) || 0;
        const guestSize = item.size || null;

        //  invalid product id → skip
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            continue;
        }

        // Check if product exists
        const product = await Product.findById(productId).select("stock sizes");
        if (!product) continue; // invalid / deleted product

        // Check stock
        if (product.stock <= 0) continue; // cannot add out-of-stock

        const hasSizes = product.sizes && product.sizes.length > 0;

        // Check size validity
        if (hasSizes) {
            if (!guestSize || !product.sizes.includes(guestSize)) {
                continue; // invalid or missing size
            }
        }

        // Get existing user item
        const existingItem = existingCart[productId] || { quantity: 0, size: hasSizes ? guestSize : null };

        const newQty = existingItem.quantity + guestQuantity;

        // Cannot exceed stock
        if (newQty > product.stock) {
            existingItem.quantity = product.stock; // clamp to max stock
        } else {
            existingItem.quantity = newQty;
        }

        // Ensure size is set correctly
        if (hasSizes) {
            existingItem.size = guestSize;
        } else {
            existingItem.size = null;
        }

        existingCart[productId] = existingItem;
    }

    user.cartData = existingCart;
    user.markModified("cartData");
    await user.save();

    return user;
};
