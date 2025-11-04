import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    image: {
        data: Buffer, 
        contentType: String, 
    },
    description: {
        type:String, 
        required:true
    },
    price:{
        type:Number, 
        required:true
    },
})



const Product = mongoose.model("Product", productSchema);
export default Product;

