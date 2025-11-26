import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: [0, "Price cannot be negative"],
        max: [10000000, "Price exceeds maximum allowed value"]
    },
    brand: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: [0, "Stock cannot be negative"],
        max: [1000, "Stock exceeds maximum allowed value"]
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    }
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
