  import User from "../models/user.module.js";
  import Product from "../models/products.module.js";
  import mongoose from "mongoose";

  const { ObjectId } = mongoose.Types;

  const getUserCart = async (req, res) => {
    try {
      const user = await User.findById(req.auth.userId).select("cartData");
      const cartData = user?.cartData || {};

      const productIds = Object.keys(cartData).filter(id => ObjectId.isValid(id));

      const products = await Product.find({ _id: { $in: productIds } })
        .select("title price image sizes stock");

      const cartArray = products.map(p => {
        const item = cartData[p._id] || { quantity: 0, size: null };
        return {
          _id: p._id,
          quantity: item.quantity,
          size: item.size,                    
          title: p.title,
          price: p.price,
          image: p.image,
          availableSizes: p.sizes || [],      
          hasSizes: !!p.sizes?.length         
        };
      });

      res.json({ success: true, cartData: cartArray });
    } catch (err) {
      res.status(500).json({ error: true, message: err.message });
    }
  };

  const addToCart = async (req, res) => {
    try {
      const userId = req.auth.userId;
      const { itemId, size } = req.body;

      if (!itemId) {
        return res.status(400).json({ error: true, message: "itemId is required" });
      }

      const product = await Product.findById(itemId).select("stock sizes");
      if (!product) {
        return res.status(404).json({ error: true, message: "Product not found" });
      }

      if (product.stock <= 0) {
        return res.status(400).json({ error: true, message: "Item out of stock" });
      }

      const hasSizes = product.sizes && product.sizes.length > 0;

      if (hasSizes && !size) {
        return res.status(400).json({ error: true, message: "Please select a size" });
      }

      if (hasSizes && size && !product.sizes.includes(size)) {
        return res.status(400).json({ error: true, message: `Size ${size} not available` });
      }

      const user = await User.findById(userId).select("cartData");
      const current = user.cartData[itemId] || { quantity: 0, size: null };

      const finalSize = hasSizes ? size : null;
      const newQty = current.quantity + 1;

      if (newQty > product.stock) {
        return res.status(400).json({
          error: true,
          message: `Only ${product.stock} items available in stock`
        });
      }

      await User.findByIdAndUpdate(
        userId,
        { $set: { [`cartData.${itemId}`]: { quantity: newQty, size: finalSize } } }
      );

      return res.json({
        success: true,
        message: "Item added to cart",
        quantity: newQty,
        size: finalSize
      });
    } catch (err) {
      res.status(500).json({ error: true, message: err.message });
    }
  };

  const modifyCartQuantity = async (req, res) => {
    try {
      const userId = req.auth.userId;
      const { itemId, action } = req.body;

      if (!itemId || !action) {
        return res.status(400).json({ error: true, message: "itemId and action required" });
      }

      if (!["increase", "decrease"].includes(action)) {
        return res.status(400).json({ error: true, message: "Action must be 'increase' or 'decrease'" });
      }

      const product = await Product.findById(itemId).select("stock");
      if (!product) {
        return res.status(404).json({ error: true, message: "Product not found" });
      }

      const user = await User.findById(userId).select("cartData");
      const current = user.cartData[itemId];

      if (!current || current.quantity <= 0) {
        return res.status(400).json({ error: true, message: "Item not in cart" });
      }

      if (action === "increase") {
        const newQty = current.quantity + 1;

        if (newQty > product.stock) {
          return res.status(400).json({
            error: true,
            message: `Only ${product.stock} items available in stock`
          });
        }

        await User.findByIdAndUpdate(
          userId,
          { $set: { [`cartData.${itemId}`]: { quantity: newQty, size: current.size } } }
        );

        return res.json({
          success: true,
          message: "Quantity increased",
          quantity: newQty,
          size: current.size
        });
      }

      if (action === "decrease") {
        if (current.quantity === 1) {
          await User.findByIdAndUpdate(userId, { $unset: { [`cartData.${itemId}`]: "" } });
          return res.json({ success: true, message: "Item removed from cart", quantity: 0 });
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
    } catch (err) {
      res.status(500).json({ error: true, message: err.message });
    }
  };


  const removeFromCart = async (req, res) => {
    try {
      const userId = req.auth.userId;
      const { itemId } = req.params;

      if (!itemId) return res.status(400).json({ error: true, message: "itemId required" });

      await User.findByIdAndUpdate(userId, { $unset: { [`cartData.${itemId}`]: "" } });
      res.json({ success: true, message: "Item removed from cart" });
    } catch (err) {
      res.status(500).json({ error: true, message: err.message });
    }
  };

  export { getUserCart, modifyCartQuantity, removeFromCart, addToCart };