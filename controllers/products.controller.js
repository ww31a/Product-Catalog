import Product from "../models/products.module.js";

export const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        res.status(200).json(products);
    }
    catch (error) {
        res.status(500).json({ message: error.message })
    }
}


export const getProductByID = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json(product);
    }
    catch (error) {
        res.status(500).json({ message: error.message })
    }
}

export const addProduct = async (req, res) => {
    try {
        const product = await Product.create({
            ...req.body,
            image: req.file?.path,
        });
        res.status(200).json(product);
    }
    catch (error) {
        res.status(500).json({ message: error.message })
    }
}

export const updateProduct = async (req, res) => {
    try {
        const updatedData = { ...req.body };
        const { id } = req.params;

        if (req.file) {
            updatedData.image = req.file.path; // new Cloudinary URL
        }

        const product = await Product.findByIdAndUpdate(id, updatedData, { new: true });

        if (!product) return res.status(404).json({ message: "Product not found" });

        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndDelete(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }
        res.status(200).json(product);
    }
    catch (error) {
        res.status(500).json({ message: error.message })
    }
}