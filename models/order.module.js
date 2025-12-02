import mongoose from "mongoose";

const generateOrderId = () => {
    // Generates 6-character alphanumeric uppercase code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PRODCAT-${code}`;
};

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        default: generateOrderId,
        unique: true,
    },
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