import User from "../models/user.module.js";
import Product from "../models/products.module.js";
import mongoose from "mongoose";

export const mergeGuestCartIntoUserCart = async (userId, guestCart) => {
const user = await User.findOne({ userId });

  if (!user.cartData) user.cartData = {};
  const existingCart = user.cartData;

  for (let item of guestCart) {
    const itemId = item._id;
    const guestQty = item.quantity || 1;
    const guestSize = item.size || null;

    if (!mongoose.Types.ObjectId.isValid(itemId)) continue;

    const product = await Product.findById(itemId).select("stock sizes");
    if (!product) continue; 

    if (product.stock <= 0) continue; 

    if (guestQty > product.stock) continue; 

    const hasSizes = product.sizes?.length > 0;

    if (hasSizes) {
      if (!guestSize) continue; 
      if (!product.sizes.includes(guestSize)) continue; 
    }

    const existing = existingCart[itemId] || { quantity: 0, size: guestSize };

    const totalQty = existing.quantity + guestQty;

    if (totalQty > product.stock) continue;

    existingCart[itemId] = {
      quantity: totalQty,
      size: hasSizes ? guestSize : null
    };
  }

  user.cartData = existingCart;
  user.markModified("cartData");
  await user.save();

  return user;
};
