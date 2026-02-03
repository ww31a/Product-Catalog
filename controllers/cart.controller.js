import mongoose from "mongoose";
import UserService from "../services/user.service.js";
import AppUserService from "../services/appUser.service.js";
import ProductService from "../services/product.service.js";
import { logActivity, logError } from "../utils/logger.js";
import { logQuery } from "../utils/logQuery.js";

const { ObjectId } = mongoose.Types;

const getUserCart = async (req, res) => {
  try {
    const user = await logQuery(req, 'UserService.findByAppUserIdWithSelect', () => UserService.findByAppUserIdWithSelect(req.auth.userId, "cartData"));
    const cartData = user?.cartData || {};

    const productIds = Object.keys(cartData).filter(id => ObjectId.isValid(id));

    if (!productIds.length) {
      return res.json({
        success: true,
        cartData: [],
        removedItems: [],
        requestId: req.requestId
      });
    }

    const products = await logQuery(req, 'ProductService.findByIdsWithSelect', () => ProductService.findByIdsWithSelect(
      productIds,
      "title price image sizes stock"
    ));

    const validCartItems = [];
    const removedItems = [];

    for (const product of products) {
      const cartItem = cartData[product._id];

      if (product.stock <= 0) {
        await logQuery(req, `UserService.removeCartItem(${product._id})`, () => UserService.removeCartItem(req.auth.userId, product._id));

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
      removedItems,
      requestId: req.requestId
    });

  } catch (err) {
    logError({
      error: err,
      context: "Get User Cart",
      metadata: { userId: req.auth.userId, requestId: req.requestId }
    });
    res.status(500).json({
      error: true,
      message: "Failed to retrieve cart",
      requestId: req.requestId
    });
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { itemId, size } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: true, message: "itemId is required", requestId: req.requestId });
    }

    const product = await logQuery(req, `ProductService.findByIdWithSelect(${itemId})`, () => ProductService.findByIdWithSelect(itemId, "stock sizes"));
    if (!product) {
      return res.status(404).json({ error: true, message: "Product not found", requestId: req.requestId });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ error: true, message: "Item out of stock", requestId: req.requestId });
    }

    const hasSizes = product.sizes && product.sizes.length > 0;

    if (hasSizes && !size) {
      return res.status(400).json({ error: true, message: "Please select a size", requestId: req.requestId });
    }

    if (hasSizes && size && !product.sizes.includes(size)) {
      return res.status(400).json({ error: true, message: `Size ${size} not available`, requestId: req.requestId });
    }

    const user = await logQuery(req, 'UserService.findByAppUserIdWithSelect', () => UserService.findByAppUserIdWithSelect(userId, "cartData"));
    const appUser = await logQuery(req, 'AppUserService.findById', () => AppUserService.findById(userId));
    const current = user?.cartData?.[itemId] || { quantity: 0, size: null };

    const finalSize = hasSizes ? size : null;
    const newQty = current.quantity + 1;

    if (newQty > product.stock) {
      return res.status(400).json({
        error: true,
        message: `Only ${product.stock} items available in stock`,
        requestId: req.requestId
      });
    }

    await logQuery(req, `UserService.updateCartItem(${itemId})`, () => UserService.updateCartItem(userId, itemId, { quantity: newQty, size: finalSize }));

    logActivity({
      email: appUser?.email,
      user: userId,
      role: "User",
      status: "success",
      target: itemId,
      action: "ADD_TO_CART",
      message: `Added item to cart`,
      metadata: { quantity: newQty, size: finalSize, requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    const response = {
      success: true,
      message: "Item added to cart",
      quantity: newQty,
      requestId: req.requestId
    };

    if (finalSize) {
      response.size = finalSize;
    }

    return res.json(response);


  } catch (err) {
    logError({
      error: err,
      context: "Add To Cart",
      metadata: { userId: req.auth.userId, itemId: req.body.itemId, requestId: req.requestId }
    });
    res.status(500).json({ error: true, message: "Failed to add item to cart", requestId: req.requestId });
  }
};

const modifyCartQuantity = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { itemId, action } = req.body;

    if (!itemId || !action) {
      return res.status(400).json({ error: true, message: "itemId and action required", requestId: req.requestId });
    }

    if (!["increase", "decrease"].includes(action)) {
      return res.status(400).json({ error: true, message: "Action must be 'increase' or 'decrease'", requestId: req.requestId });
    }

    const product = await logQuery(req, `ProductService.findByIdWithSelect(${itemId})`, () => ProductService.findByIdWithSelect(itemId, "stock"));
    if (!product) {
      return res.status(404).json({ error: true, message: "Product not found", requestId: req.requestId });
    }

    const user = await logQuery(req, 'UserService.findByAppUserIdWithSelect', () => UserService.findByAppUserIdWithSelect(userId, "cartData"));
    const appUser = await logQuery(req, 'AppUserService.findById', () => AppUserService.findById(userId));
    const current = user?.cartData?.[itemId];

    if (!current || current.quantity <= 0) {
      return res.status(400).json({ error: true, message: "Item not in cart", requestId: req.requestId });
    }

    if (action === "increase") {
      const newQty = current.quantity + 1;

      if (newQty > product.stock) {
        return res.status(400).json({
          error: true,
          message: `Only ${product.stock} items available in stock`,
          requestId: req.requestId
        });
      }

      await logQuery(req, `UserService.updateCartItem(${itemId}, increase)`, () => UserService.updateCartItem(userId, itemId, { quantity: newQty, size: current.size }));

      logActivity({
        email: appUser?.email,
        user: userId,
        role: "User",
        status: "success",
        target: itemId,
        action: "INCREASE_CART_QUANTITY",
        message: `Increased cart quantity`,
        metadata: { newQuantity: newQty, requestId: req.requestId },
        ip: req.ip,
        userAgent: req.get("User-Agent")
      });

      const response = {
        success: true,
        message: "Quantity increased",
        quantity: newQty,
        requestId: req.requestId
      };

      if (current.size) {
        response.size = current.size;
      }

      return res.json(response);
    }

    if (action === "decrease") {
      if (current.quantity === 1) {
        await logQuery(req, `UserService.removeCartItem(${itemId})`, () => UserService.removeCartItem(userId, itemId));

        logActivity({
          email: appUser?.email,
          user: userId,
          role: "User",
          status: "success",
          target: itemId,
          action: "REMOVE_FROM_CART",
          message: `Removed item from cart (qty decreased to 0)`,
          metadata: { requestId: req.requestId },
          ip: req.ip,
          userAgent: req.get("User-Agent")
        });

        return res.json({ success: true, message: "Item removed from cart", quantity: 0, requestId: req.requestId });
      }

      const newQty = current.quantity - 1;
      await logQuery(req, `UserService.updateCartItem(${itemId}, decrease)`, () => UserService.updateCartItem(userId, itemId, { quantity: newQty, size: current.size }));

      logActivity({
        email: appUser?.email,
        user: userId,
        role: "User",
        status: "success",
        target: itemId,
        action: "DECREASE_CART_QUANTITY",
        message: `Decreased cart quantity`,
        metadata: { newQuantity: newQty, requestId: req.requestId },
        ip: req.ip,
        userAgent: req.get("User-Agent")
      });

      const response = {
        success: true,
        message: "Quantity decreased",
        quantity: newQty,
        requestId: req.requestId
      };

      if (current.size) {
        response.size = current.size;
      }

      return res.json(response);
    }
  } catch (err) {
    logError({
      error: err,
      context: "Modify Cart Quantity",
      metadata: { userId: req.auth.userId, itemId: req.body.itemId, requestId: req.requestId }
    });
    res.status(500).json({ error: true, message: "Failed to modify cart quantity", requestId: req.requestId });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ error: true, message: "itemId required", requestId: req.requestId });
    }

    const appUser = await logQuery(req, 'AppUserService.findById', () => AppUserService.findById(userId));
    await logQuery(req, `UserService.removeCartItem(${itemId})`, () => UserService.removeCartItem(userId, itemId));

    logActivity({
      email: appUser?.email,
      user: userId,
      role: "User",
      status: "success",
      target: itemId,
      action: "REMOVE_FROM_CART",
      message: `Removed item from cart`,
      metadata: { requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.json({ success: true, message: "Item removed from cart", requestId: req.requestId });
  } catch (err) {
    logError({
      error: err,
      context: "Remove From Cart",
      metadata: { userId: req.auth.userId, itemId: req.params.itemId, requestId: req.requestId }
    });
    res.status(500).json({ error: true, message: "Failed to remove item from cart", requestId: req.requestId });
  }
};

export { getUserCart, modifyCartQuantity, removeFromCart, addToCart };