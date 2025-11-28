import User from "../models/user.module.js";
import Product from "../models/products.module.js";
import mongoose from "mongoose";

export const mergeGuestCartIntoUserCart = async (userId, guestCart) => {
  const user = await User.findById(userId);

  if (!user.cartData) user.cartData = {};
  const existingCart = user.cartData;

  for (let item of guestCart) {
    const itemId = item._id;
    const guestQty = item.quantity || 1;
    const guestSize = item.size || null;

    // 1️⃣ Validate Mongo ID
    if (!mongoose.Types.ObjectId.isValid(itemId)) continue;

    // 2️⃣ Fetch product
    const product = await Product.findById(itemId).select("stock sizes");
    if (!product) continue; // product removed from DB

    // 3️⃣ Validate stock
    if (product.stock <= 0) continue; // out of stock

    // 4️⃣ Guest quantity cannot exceed stock → reject item
    if (guestQty > product.stock) continue; 

    // 5️⃣ Size validation
    const hasSizes = product.sizes?.length > 0;

    if (hasSizes) {
      if (!guestSize) continue; // size required
      if (!product.sizes.includes(guestSize)) continue; // size not allowed
    }

    // 6️⃣ Merge with existing cart
    const existing = existingCart[itemId] || { quantity: 0, size: guestSize };

    const totalQty = existing.quantity + guestQty;

    // 7️⃣ Combined quantity exceeds stock → reject item completely
    if (totalQty > product.stock) continue;

    // 8️⃣ Passed validations → add to cart
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
