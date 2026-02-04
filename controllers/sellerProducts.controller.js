import mongoose from "mongoose";
import ProductService from '../services/product.service.js';
import StockHistoryService from "../services/stockHistory.service.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUploader.js";
import { logActivity, logError, logApplication } from "../utils/logger.js";
import AppUser from "../models/AppUser.module.js";
import sharp from "sharp";

export const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.auth.userId;

    if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ success: false, message: "Invalid seller ID", requestId: req.requestId });
    }

    const products = await ProductService.findByOwner(sellerId);
    return res.status(200).json({ success: true, products, requestId: req.requestId });
  } catch (err) {
    logError({
      error: err,
      context: "Get Seller Products",
      metadata: { sellerId: req.auth.userId, requestId: req.requestId }
    });
    return res.status(500).json({ success: false, error: true, message: "Failed to fetch products", requestId: req.requestId });
  }
};

export const getSellerProductByID = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.auth.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID", requestId: req.requestId });
    }

    const product = await ProductService.findByIdAndOwner(id, sellerId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found or not owned by you", requestId: req.requestId });
    }

    res.status(200).json({ success: true, product, requestId: req.requestId });
  } catch (err) {
    logError({
      error: err,
      context: "Get Seller Product by ID",
      metadata: { sellerId: req.auth.userId, productId: req.params.id, requestId: req.requestId }
    });
    res.status(500).json({ success: false, error: true, message: "Failed to fetch product", requestId: req.requestId });
  }
};

export const addProduct = async (req, res) => {
  try {
    const { title, description, stock, price, brand, category, sizes } = req.body;
    const sellerId = req.auth.userId;

    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Image is required", requestId: req.requestId });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, "product_catalog");

    let parsedSizes = [];
    if (sizes) {
      parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
      for (let v of parsedSizes) {
        if (!["S", "M", "L", "XL"].includes(v)) {
          return res.status(400).json({ success: false, message: "sizes must be one of: S, M, L, XL", requestId: req.requestId });
        }
      }
    }

    const product = await ProductService.create({
      title,
      description,
      price,
      stock,
      brand,
      category,
      sizes: parsedSizes,
      image: result.secure_url,
      owner: sellerId
    });

    if (product.stock > 0) {
      await StockHistoryService.create({
        productId: product._id,
        previousStock: 0,
        newStock: product.stock,
        change: product.stock,
        type: "add",
        reason: "restock",
        changedBy: sellerId,
        notes: "Initial stock added"
      });
    }

    const sellerObj = await AppUser.findById(sellerId);
    logActivity({
      email: sellerObj?.email,
      user: sellerId,
      role: "Seller",
      status: "success",
      target: product._id.toString(),
      action: "ADD_PRODUCT",
      message: `Product added: ${title}`,
      metadata: { productId: product._id, requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.status(201).json({ success: true, product, requestId: req.requestId });
  } catch (err) {
    logError({
      error: err,
      context: "Add Product",
      metadata: { sellerId: req.auth.userId, title: req.body.title, requestId: req.requestId }
    });
    res.status(500).json({ success: false, error: true, message: "Failed to add product", requestId: req.requestId });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.auth.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID", requestId: req.requestId });
    }

    const existingProduct = await ProductService.findByIdAndOwner(id, sellerId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found or not owned by you", requestId: req.requestId });
    }

    const updatedData = { ...req.body };

    if (req.file?.buffer) {
      const compressedBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1280, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const result = await uploadBufferToCloudinary(compressedBuffer, "product_catalog");
      updatedData.image = result.secure_url;
    }

    if (updatedData.sizes) {
      const parsedSizes = typeof updatedData.sizes === "string"
        ? JSON.parse(updatedData.sizes)
        : updatedData.sizes;
      for (let v of parsedSizes) {
        if (!["S", "M", "L", "XL"].includes(v)) {
          return res.status(400).json({ success: false, message: "sizes must be one of: S, M, L, XL", requestId: req.requestId });
        }
      }
      updatedData.sizes = parsedSizes;
    }

    const previousStock = existingProduct.stock;
    const newStock = updatedData.stock !== undefined ? Number(updatedData.stock) : undefined;

    const updatedProduct = await ProductService.update(id, updatedData);

    if (newStock !== undefined && previousStock !== newStock) {
      const change = newStock - previousStock;
      await StockHistoryService.create({
        productId: existingProduct._id,
        previousStock,
        newStock,
        change,
        type: change > 0 ? "add" : "remove",
        reason: change > 0 ? "restock" : "adjustment",
        changedBy: sellerId,
        notes: `Stock ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}`
      });

      logApplication({
        event: "STOCK_UPDATED",
        message: `Stock for ${existingProduct.title} updated from ${previousStock} to ${newStock}`,
        metadata: { productId: id, previousStock, newStock, change, requestId: req.requestId }
      });
    }

    const sellerObj = await AppUser.findById(sellerId);
    logActivity({
      email: sellerObj?.email,
      user: sellerId,
      role: "Seller",
      status: "success",
      target: id,
      action: "UPDATE_PRODUCT",
      message: `Product updated: ${updatedProduct.title}`,
      metadata: { productId: id, requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.status(200).json({ success: true, product: updatedProduct, requestId: req.requestId });
  } catch (err) {
    logError({
      error: err,
      context: "Update Product",
      metadata: { sellerId: req.auth.userId, productId: req.params.id, requestId: req.requestId }
    });
    res.status(500).json({ success: false, error: true, message: "Failed to update product", requestId: req.requestId });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.auth.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID", requestId: req.requestId });
    }

    const product = await ProductService.deleteByIdAndOwner(id, sellerId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found or not owned by you", requestId: req.requestId });
    }

    await StockHistoryService.deleteByProductId(id);

    const sellerObj = await AppUser.findById(sellerId);
    logActivity({
      email: sellerObj?.email,
      user: sellerId,
      role: "Seller",
      status: "success",
      target: id,
      action: "DELETE_PRODUCT",
      message: `Product deleted: ${product.title}`,
      metadata: { productId: id, requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.status(200).json({
      success: true,
      message: "Product and its stock history deleted successfully",
      product,
      requestId: req.requestId
    });
  } catch (err) {
    logError({
      error: err,
      context: "Delete Product",
      metadata: { sellerId: req.auth.userId, productId: req.params.id, requestId: req.requestId }
    });
    res.status(500).json({ success: false, error: true, message: "Failed to delete product", requestId: req.requestId });
  }
};

export const bulkDeleteProducts = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: "productIds must be a non-empty array", requestId: req.requestId });
    }

    const invalidIds = productIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid product IDs: ${invalidIds.join(", ")}`, requestId: req.requestId });
    }

    const result = await ProductService.bulkDeleteByOwner(productIds, sellerId);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "No products deleted. Make sure they exist and belong to you.", requestId: req.requestId });
    }

    await StockHistoryService.deleteByProductIds(productIds);

    const appUser = await AppUser.findById(sellerId).lean();
    logActivity({
      email: appUser?.email,
      user: sellerId,
      role: "Seller",
      status: "success",
      action: "BULK_DELETE_PRODUCTS",
      message: `Bulk deleted ${result.deletedCount} products`,
      metadata: { productIds, requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} product(s) deleted successfully`,
      deletedCount: result.deletedCount,
      requestId: req.requestId
    });
  } catch (err) {
    logError({
      error: err,
      context: "Bulk Delete Products",
      metadata: { sellerId: req.auth.userId, productIds: req.body.productIds, requestId: req.requestId }
    });
    res.status(500).json({ success: false, error: true, message: "Failed to bulk delete products", requestId: req.requestId });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    const sellerId = req.auth.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID", requestId: req.requestId });
    }

    if (stock === undefined || isNaN(stock) || Number(stock) < 0) {
      return res.status(400).json({ success: false, message: "Stock must be non-negative", requestId: req.requestId });
    }

    const existingProduct = await ProductService.findByIdAndOwner(id, sellerId);
    if (!existingProduct) {
      return res.status(400).json({ success: false, message: "Product does not exist", requestId: req.requestId });
    }

    const previousStock = existingProduct.stock;
    const newStock = parseInt(stock);

    const updatedProduct = await ProductService.updateStock(id, newStock);

    if (previousStock !== newStock) {
      const change = newStock - previousStock;
      await StockHistoryService.create({
        productId: existingProduct._id,
        previousStock,
        newStock,
        change,
        type: change > 0 ? "add" : "remove",
        reason: change > 0 ? "restock" : "adjustment",
        changedBy: sellerId,
        notes: "Quick stock change from seller stock page"
      });

      logApplication({
        event: "STOCK_UPDATED",
        message: `Stock for ${existingProduct.title} updated (quick update) from ${previousStock} to ${newStock}`,
        metadata: { productId: id, previousStock, newStock, change, requestId: req.requestId }
      });

      const appUser = await AppUser.findById(sellerId).lean();
      logActivity({
        email: appUser?.email,
        user: sellerId,
        role: "Seller",
        status: "success",
        target: id,
        action: "UPDATE_STOCK",
        message: `Stock updated for product ${id}: ${previousStock} -> ${newStock}`,
        metadata: { productId: id, change, requestId: req.requestId },
        ip: req.ip,
        userAgent: req.get("User-Agent")
      });
    }

    res.status(200).json({ success: true, message: "Stock Updated Successfully", product: updatedProduct, requestId: req.requestId });
  } catch (err) {
    logError({
      error: err,
      context: "Quick Update Stock",
      metadata: { sellerId: req.auth.userId, productId: req.params.id, requestId: req.requestId }
    });
    res.status(500).json({ success: false, error: true, message: "Failed to update stock", requestId: req.requestId });
  }
};
