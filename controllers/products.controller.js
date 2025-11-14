import mongoose from "mongoose";
import Product from "../models/products.module.js";


export const getAllProducts = async (req, res) => {
  try {
    // Get currentPage and limit from query params
    const page = req.query.page ? Number(req.query.page) : null;
    const limit = req.query.limit ? Number(req.query.limit) : null;

    let products;
    let total = await Product.countDocuments({});

    if (page && limit) {
      // Pagination requested
      const skip = (page - 1) * limit;
      products = await Product.find({})
        .sort({ createdAt: -1 }) // sort by newest first
        .skip(skip)
        .limit(limit);

      res.status(200).json({
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        products,
      });
    } else {
      // No pagination, return all products sorted
      products = await Product.find({}).sort({ createdAt: -1 });
      res.status(200).json({
        total,
        products,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



 
export const getProductByID = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

 
export const addProduct = async (req, res) => {
  try {
    const { title, description, price, brand } = req.body;
    if (!title || !description || !price || !brand) {
      return res.status(400).json({ message: "Title, description,brand and price are required" });
    }

    const product = await Product.create({
      title,
      description,
      price,
      brand,
      image: req.file?.path || "",
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const updatedData = { ...req.body };

    if (req.file) updatedData.image = req.file.path;

    const requiredFields = ["title", "description", "price","brand"];
    for (let field of requiredFields) {
      if (field in updatedData && !updatedData[field]) {
        return res.status(400).json({ message: `${field} cannot be empty` });
      }
    }

    const product = await Product.findByIdAndUpdate(id, updatedData, { new: true });

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted successfully", product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
