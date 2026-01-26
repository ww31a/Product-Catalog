import mongoose from "mongoose";
import ProductService from '../services/product.service.js';
import StockHistoryService from "../services/stockHistory.service.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUploader.js";
import { logActivity, logError, logApplication } from "../utils/logger.js";
import AppUser from "../models/AppUser.module.js";

export const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.auth.userId;

    if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ success: false, message: "Invalid seller ID" });
    }

    const products = await ProductService.findByOwner(sellerId);
    return res.status(200).json({ success: true, products });
  } catch (err) {
    logError({
      error: err,
      context: "Get Seller Products",
      metadata: { sellerId: req.auth.userId }
    });
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getSellerProductByID = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.auth.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await ProductService.findByIdAndOwner(id, sellerId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found or not owned by you" });
    }

    res.status(200).json({ success: true, product });
  } catch (err) {
    logError({
      error: err,
      context: "Get Seller Product by ID",
      metadata: { sellerId: req.auth.userId, productId: req.params.id }
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addProduct = async (req, res) => {
  try {
    const { title, description, stock, price, brand, category, sizes } = req.body;
    const sellerId = req.auth.userId;

    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, "product_catalog");


    // Parse sizes
    let parsedSizes = [];
    if (sizes) {
      parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
      for (let v of parsedSizes) {
        if (!["S", "M", "L", "XL"].includes(v)) {
          return res.status(400).json({ success: false, message: "sizes must be one of: S, M, L, XL" });
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

    // Initial stock history
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
      metadata: { productId: product._id },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    logError({
      error: err,
      context: "Add Product",
      metadata: { sellerId: req.auth.userId, title: req.body.title }
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.auth.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const existingProduct = await ProductService.findByIdAndOwner(id, sellerId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found or not owned by you" });
    }

    const updatedData = { ...req.body };

    // If new file uploaded, compress + upload to Cloudinary
    if (req.file?.buffer) {
      const compressedBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1280, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const result = await uploadBufferToCloudinary(compressedBuffer, "product_catalog");
      updatedData.image = result.secure_url;
    }


    // Parse sizes
    if (updatedData.sizes) {
      const parsedSizes = typeof updatedData.sizes === "string"
        ? JSON.parse(updatedData.sizes)
        : updatedData.sizes;
      for (let v of parsedSizes) {
        if (!["S", "M", "L", "XL"].includes(v)) {
          return res.status(400).json({ success: false, message: "sizes must be one of: S, M, L, XL" });
        }
      }
      updatedData.sizes = parsedSizes;
    }

    // Stock change
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
        metadata: { productId: id, previousStock, newStock, change }
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
      metadata: { productId: id },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.status(200).json({ success: true, product: updatedProduct });
  } catch (err) {
    logError({
      error: err,
      context: "Update Product",
      metadata: { sellerId: req.auth.userId, productId: req.params.id }
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.auth.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await ProductService.deleteByIdAndOwner(id, sellerId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found or not owned by you" });
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
      metadata: { productId: id },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.status(200).json({
      success: true,
      message: "Product and its stock history deleted successfully",
      product
    });
  } catch (err) {
    logError({
      error: err,
      context: "Delete Product",
      metadata: { sellerId: req.auth.userId, productId: req.params.id }
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const bulkDeleteProducts = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: "productIds must be a non-empty array" });
    }

    const invalidIds = productIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid product IDs: ${invalidIds.join(", ")}` });
    }

    const result = await ProductService.bulkDeleteByOwner(productIds, sellerId);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "No products deleted. Make sure they exist and belong to you." });
    }

    await StockHistoryService.deleteByProductIds(productIds);

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} product(s) deleted successfully`,
      deletedCount: result.deletedCount
    });

    logActivity({
      email: (await AppUser.findById(sellerId).lean())?.email,
      user: sellerId,
      role: "Seller",
      status: "success",
      action: "BULK_DELETE_PRODUCTS",
      message: `Bulk deleted ${result.deletedCount} products`,
      metadata: { productIds },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

  } catch (err) {
    logError({
      error: err,
      context: "Bulk Delete Products",
      metadata: { sellerId: req.auth.userId, productIds: req.body.productIds }
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    const sellerId = req.auth.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    if (stock === undefined || isNaN(stock) || Number(stock) < 0) {
      return res.status(400).json({ success: false, message: "Stock must be non-negative" });
    }

    const existingProduct = await ProductService.findByIdAndOwner(id, sellerId);
    if (!existingProduct) {
      return res.status(400).json({ success: false, message: "Product does not exist" });
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
        metadata: { productId: id, previousStock, newStock, change }
      });

      logActivity({
        email: (await AppUser.findById(sellerId).lean())?.email,
        user: sellerId,
        role: "Seller",
        status: "success",
        target: id,
        action: "UPDATE_STOCK",
        message: `Stock updated for product ${id}: ${previousStock} -> ${newStock}`,
        metadata: { productId: id, change },
        ip: req.ip,
        userAgent: req.get("User-Agent")
      });
    }

    res.status(200).json({ success: true, message: "Stock Updated Successfully", product: updatedProduct });
  } catch (err) {
    logError({
      error: err,
      context: "Quick Update Stock",
      metadata: { sellerId: req.auth.userId, productId: req.params.id }
    });
    res.status(500).json({ success: false, message: err.message });
  }
};