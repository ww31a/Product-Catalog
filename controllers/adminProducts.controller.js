import mongoose from "mongoose";
import Product from '../models/products.module.js';
import stockHistory from "../models/stockHistory.module.js";


// GET all admin products
export const getAdminProducts = async (req, res) => {
  try {
    const adminId = req.user?.id;

    if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ success: false, message: "Invalid admin ID" });
    }

    const products = await Product.find({ owner: adminId });
    return res.status(200).json({ success: true, products });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};



// GET a single product by ID
export const getAdminProductByID = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findOne({ _id: id, owner: adminId });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found or not owned by you" });
    }

    res.status(200).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// ADD product – also create initial stock log if stock > 0
export const addProduct = async (req, res) => {
  try {
    const { title, description, stock, price, brand, category, sizes } = req.body;

    if (!req.file?.path) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

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

    const product = await Product.create({
      title,
      description,
      price,
      stock,
      brand,
      category,
      sizes: parsedSizes,
      image: req.file?.path || "",
      owner: req.user.id
    });

    // ✔ Create initial stock history (only if stock > 0)
    if (product.stock > 0) {
      await stockHistory.create({
        productId: product._id,
        previousStock: 0,
        newStock: product.stock,
        change: product.stock,
        type: "add",
        reason: "restock",
        changedBy: req.user.id,
        notes: "Initial stock added"
      });
    }

    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// UPDATE product – logs STOCK CHANGES ONLY
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const existingProduct = await Product.findOne({ _id: id, owner: adminId });
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found or not owned by you" });
    }

    const updatedData = { ...req.body };
    if (req.file) updatedData.image = req.file.path;

    // Parse and validate sizes
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


    // 🟨 CHECK IF STOCK IS BEING CHANGED
    let previousStock = Number(existingProduct.stock);
    let newStock = updatedData.stock !== undefined
      ? Number(updatedData.stock)
      : undefined;

    const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, { new: true });

    // 🟦 ONLY LOG HISTORY IF STOCK ACTUALLY CHANGED
    if (newStock !== undefined && previousStock !== newStock) {
      const change = newStock - previousStock;

      await stockHistory.create({
        productId: existingProduct._id,
        previousStock,
        newStock,
        change,
        type: change > 0 ? "add" : "remove",
        reason: change > 0 ? "restock" : "adjustment",
        changedBy: adminId,
        notes: `Stock ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}`
      });
    }

    res.status(200).json({ success: true, product: updatedProduct });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// DELETE product – also delete associated stock history
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findOneAndDelete({ _id: id, owner: adminId });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found or not owned by you" });
    }

    // ✅ Delete all stock history for this product
    await stockHistory.deleteMany({ productId: id });

    res.status(200).json({
      success: true,
      message: "Product and its stock history deleted successfully",
      product
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// BULK DELETE – also delete associated stock history
export const bulkDeleteProducts = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: "productIds must be a non-empty array" });
    }

    const invalidIds = productIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid product IDs: ${invalidIds.join(", ")}` });
    }

    const result = await Product.deleteMany({
      _id: { $in: productIds },
      owner: adminId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "No products deleted. Make sure they exist and belong to you." });
    }

    // ✅ Delete all stock history for these products
    const historyResult = await stockHistory.deleteMany({
      productId: { $in: productIds }
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} product(s) deleted successfully`,
      deletedCount: result.deletedCount,
      stockHistoryDeleted: historyResult.deletedCount
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
//update stock
export const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    const adminId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" })
    }
    if (stock === undefined || isNaN(stock) || Number(stock) < 0) {
      return res.status(400).json({ success: false, message: "Stock must be non-negative" })
    }

    const existingProduct = await Product.findOne({ _id: id, owner: adminId });
    if (!existingProduct) {
      return res.status(400).json({ success: false, message: "Product does not exist" });
    }

    const previousStock = existingProduct.stock;
    const newStock = parseInt(stock);

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { stock: newStock },
      { new: true }
    ).populate('owner', 'name email');

    if (previousStock !== newStock) {
      const change = newStock - previousStock;

      await stockHistory.create({
        productId: existingProduct._id,
        previousStock,
        newStock,
        change,
        type: change > 0 ? "add" : "remove",
        reason: change > 0 ? "restock" : "adjustment",
        changedBy: adminId,
        notes: "Quick stock change from seller stock page"
      })
    }
    if (updatedProduct.stock == newStock) {
      return res.status(200).json({ success: true, message: "Stock Updated Succesfully" })
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}