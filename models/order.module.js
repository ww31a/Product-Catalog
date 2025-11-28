import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: { type: Array, required: true },
    amount: { type: Number, required: true },
    address: { type: Object, required: true },
    paymentMethod: { type: String, required: true },
    payment: { type: Boolean, required: true, default: false },
    status: { type: String, enum: ["pending", "processing", "delivered", "cancelled"], default: "pending" },
    date: { type: Number, required:true }
}, { timestamps: true })


const Order = mongoose.model("Order", orderSchema);
export default Order;