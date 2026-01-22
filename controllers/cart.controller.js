import mongoose from "mongoose";
import UserService from "../services/user.service.js";
import ProductService from "../services/product.service.js";

const { ObjectId } = mongoose.Types;

const getUserCart = async (req, res) => {
  try {
    const user = await UserService.findByAppUserIdWithSelect(req.auth.userId, "cartData");
    const cartData = user?.cartData || {};

    const productIds = Object.keys(cartData).filter(id => ObjectId.isValid(id));

    if (!productIds.length) {
      return res.json({
        success: true,
        cartData: [],
        removedItems: []
      });
    }

    const products = await ProductService.findByIdsWithSelect(
      productIds,
      "title price image sizes stock"
    );

    const validCartItems = [];
    const removedItems = [];

    for (const product of products) {
      const cartItem = cartData[product._id];

      if (product.stock <= 0) {
        await UserService.removeCartItem(req.auth.userId, product._id);

        removedItems.push({
          productId: product._id,
          title: product.title,
          reason: "Out of stock"
        });

        continue;
      }

      validCartItems.push({
        _id: product._id,
        quantity: cartItem.quantity,
        size: cartItem.size,
        title: product.title,
        price: product.price,
        image: product.image,
        availableSizes: product.sizes || [],
        hasSizes: !!product.sizes?.length
      });
    }

    return res.json({
      success: true,
      cartData: validCartItems,
      removedItems
    });

  } catch (err) {
    res.status(500).json({
      error: true,
      message: err.message
    });
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { itemId, size } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: true, message: "itemId is required" });
    }

    const product = await ProductService.findByIdWithSelect(itemId, "stock sizes");
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

    const user = await UserService.findByAppUserIdWithSelect(userId, "cartData");
    const current = user.cartData[itemId] || { quantity: 0, size: null };

    const finalSize = hasSizes ? size : null;
    const newQty = current.quantity + 1;

    if (newQty > product.stock) {
      return res.status(400).json({
        error: true,
        message: `Only ${product.stock} items available in stock`
      });
    }

    await UserService.updateCartItem(userId, itemId, { quantity: newQty, size: finalSize });

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

    const product = await ProductService.findByIdWithSelect(itemId, "stock");
    if (!product) {
      return res.status(404).json({ error: true, message: "Product not found" });
    }

    const user = await UserService.findByAppUserIdWithSelect(userId, "cartData");
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

      await UserService.updateCartItem(userId, itemId, { quantity: newQty, size: current.size });

      return res.json({
        success: true,
        message: "Quantity increased",
        quantity: newQty,
        size: current.size
      });
    }

    if (action === "decrease") {
      if (current.quantity === 1) {
        await UserService.removeCartItem(userId, itemId);
        return res.json({ success: true, message: "Item removed from cart", quantity: 0 });
      }

      const newQty = current.quantity - 1;
      await UserService.updateCartItem(userId, itemId, { quantity: newQty, size: current.size });

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

    if (!itemId) {
      return res.status(400).json({ error: true, message: "itemId required" });
    }

    await UserService.removeCartItem(userId, itemId);
    res.json({ success: true, message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

export { getUserCart, modifyCartQuantity, removeFromCart, addToCart };