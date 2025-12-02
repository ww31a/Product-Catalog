import mongoose from "mongoose";

const stockHistorySchema = new mongoose.Schema({
    productId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required:true
    },
    previousStock:{
        type:Number,
        required:true
    },
    newStock:{
        type:Number,
        required:true
    },
    change:{
        type:Number,
        required:true
    },
    type:{
        type:String,
        enum:['add','remove'],
        required:true
    },
    reason:{
        type:String,
        enum:['restock','sale','damage','return','adjustment'],
        required:true
    },
    changedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Admin",
        required:true
    },
    orderId:{
        type:String
    },
    notes: {
        type:String
    }

},{timestamps:true});

const stockHistory = mongoose.model("StockHistory",stockHistorySchema)
export default stockHistory;