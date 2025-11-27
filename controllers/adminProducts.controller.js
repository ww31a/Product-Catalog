import mongoose from "mongoose";
import Product from '../models/products.module.js';

// GET all admin products
export const getAdminProducts = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ message: "Invalid admin ID" });
    }

    const products = await Product.find({ owner: adminId });
    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET a single product by ID
export const getAdminProductByID = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findOne({ _id: id, owner: adminId });
    if (!product) {
      return res.status(404).json({ message: "Product not found or not owned by you" });
    }

    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADD product
export const addProduct = async (req, res) => {
  try {
    const { title, description, stock, price, brand, category, sizes } = req.body;

    if ([title, description, brand].some(val => !val) || price == null) {
      return res.status(400).json({ message: "Title, description, brand, and price are required" });
    }

    // Parse sizes if sent as JSON string
    let parsedsizes = [];
    if (sizes) {
      parsedsizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;

      // Validate each variation: must be S, M, or L
      for (let v of parsedsizes) {
        if (!["S", "M", "L", "XL"].includes(v)) {
          return res.status(400).json({ message: "sizes must be one of: S, M, L, XL" });
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
      sizes: parsedsizes,
      image: req.file?.path || "", // multer/cloudinary file
      owner: req.user.id
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const existingProduct = await Product.findOne({ _id: id, owner: adminId });
    if (!existingProduct) return res.status(404).json({ message: "Product not found or not owned by you" });

    const updatedData = { ...req.body };
    if (req.file) updatedData.image = req.file.path;

    // Parse and validate sizes if provided
    if (updatedData.sizes) {
      const parsedsizes = typeof updatedData.sizes === "string"
        ? JSON.parse(updatedData.sizes)
        : updatedData.sizes;

      for (let v of parsedsizes) {
        if (!["S", "M", "L", "XL"].includes(v)) {
          return res.status(400).json({ message: "sizes must be one of: S, M, L, XL" });
        }
      }
      updatedData.sizes = parsedsizes;
    }

    const requiredFields = ["title", "description", "price", "brand"];
    for (let field of requiredFields) {
      if (field in updatedData && !updatedData[field]) {
        return res.status(400).json({ message: `${field} cannot be empty` });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, { new: true });
    res.status(200).json(updatedProduct);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findOneAndDelete({ _id: id, owner: adminId });
    if (!product) return res.status(404).json({ message: "Product not found or not owned by you" });

    res.status(200).json({ message: "Product deleted successfully", product });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
