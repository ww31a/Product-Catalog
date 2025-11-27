// controllers/cart.controller.js
import User from "../models/user.module.js";
import Product from "../models/products.module.js";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

const getUserCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("cartData");
    const cartData = user?.cartData || {};

    const productIds = Object.keys(cartData).filter(id => ObjectId.isValid(id));

    const products = await Product.find({ _id: { $in: productIds } })
      .select("title price image sizes stock");

    const cartArray = products.map(p => {
      const item = cartData[p._id] || { quantity: 0, size: null };
      return {
        _id: p._id,
        quantity: item.quantity,
        size: item.size,                    // may be null
        title: p.title,
        price: p.price,
        image: p.image,
        availableSizes: p.sizes || [],      // empty if no sizes
        hasSizes: !!p.sizes?.length         // helpful for frontend
      };
    });

    res.json({ success: true, cartData: cartArray });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

const modifyCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, action, size } = req.body;

    if (!itemId || !action) {
      return res.status(400).json({ error: true, message: "itemId and action required" });
    }

    const product = await Product.findById(itemId).select("stock sizes");
    if (!product) return res.status(404).json({ error: true, message: "Product not found" });

    const user = await User.findById(userId).select("cartData");
    const current = user.cartData[itemId] || { quantity: 0, size: null };

    // --- ADD ---
    if (action === "add") {
      if (product.stock <= 0) {
        return res.status(400).json({ error: true, message: "Item out of stock" });
      }

      const hasSizes = product.sizes && product.sizes.length > 0;

      // If product HAS sizes → size is REQUIRED
      if (hasSizes && !size) {
        return res.status(400).json({ error: true, message: "Please select a size" });
      }

      // If product has sizes, validate the selected size
      if (hasSizes && size && !product.sizes.includes(size)) {
        return res.status(400).json({ error: true, message: `Size ${size} not available` });
      }

      // If product has NO sizes → ignore size param
      const finalSize = hasSizes ? size : null;
      const newQty = current.quantity + 1;

      await User.findByIdAndUpdate(
        userId,
        { $set: { [`cartData.${itemId}`]: { quantity: newQty, size: finalSize } } }
      );

      return res.json({
        success: true,
        message: "Item added",
        quantity: newQty,
        size: finalSize
      });
    }

    // --- SUBTRACT ---
    if (action === "subtract") {
      if (current.quantity <= 0) {
        return res.status(400).json({ error: true, message: "Item not in cart" });
      }

      if (current.quantity === 1) {
        await User.findByIdAndUpdate(userId, { $unset: { [`cartData.${itemId}`]: "" } });
        return res.json({ success: true, message: "Item removed from cart" });
      }

      const newQty = current.quantity - 1;
      await User.findByIdAndUpdate(
        userId,
        { $set: { [`cartData.${itemId}`]: { quantity: newQty, size: current.size } } }
      );

      return res.json({
        success: true,
        message: "Quantity decreased",
        quantity: newQty,
        size: current.size
      });
    }

    return res.status(400).json({ error: true, message: "Invalid action" });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    if (!itemId) return res.status(400).json({ error: true, message: "itemId required" });

    await User.findByIdAndUpdate(userId, { $unset: { [`cartData.${itemId}`]: "" } });
    res.json({ success: true, message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

export { getUserCart, modifyCart, removeFromCart };