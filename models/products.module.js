import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
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
        type: String,

    }
    // owner: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Admin",   
    //     required: true,
    // }
}, { timestamps: true });



const Product = mongoose.model("Product", productSchema);
export default Product;

