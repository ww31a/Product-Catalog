import mongoose from "mongoose";
import ProductService from "../services/product.service.js";

export const getAllProducts = async (req, res) => {
  try {
    const page = Number(req.query.page) || null;
    const limit = Number(req.query.limit) || null;
    const search = req.query.search || "";
    const category = req.query.category || "";
    const minPrice = Number(req.query.minPrice) || null;
    const maxPrice = Number(req.query.maxPrice) || null;

    // Build filter object
    const filter = {};

    // Search filter (searches in product name and description)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } }
      ];
    }

    // Category filter
    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    // Price range filter
    if (minPrice !== null || maxPrice !== null) {
      filter.price = {};
      if (minPrice !== null) filter.price.$gte = minPrice;
      if (maxPrice !== null) filter.price.$lte = maxPrice;
    }

    // Get total count using service
    const total = await ProductService.countDocuments(filter);
    let products;

    if (page && limit) {
      if (page < 1 || limit < 1) {
        return res.status(400).json({ message: "Page & limit must be ≥ 1" });
      }
      const skip = (page - 1) * limit;
      
      // Use service for paginated query
      products = await ProductService.findWithPagination(
        filter, 
        { createdAt: -1 }, 
        skip, 
        limit, 
        "-owner"
      );

      res.status(200).json({
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        products,
      });
    } else {
      // Use service for all products
      products = await ProductService.findAllWithSelect(
        filter, 
        "-owner", 
        { createdAt: -1 }
      );
      res.status(200).json({ total, products });
    }

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProductByID = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await ProductService.findByIdWithSelect(id, "-owner");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};