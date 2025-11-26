import Order from "../models/order.module.js";
import Product from "../models/products.module.js";
export const getAdminOrders = async (req, res) => {
    try {
        const adminId = req.user.id;

        // Step 1: Get product IDs owned by this admin
        const products = await Product.find({ owner: adminId }).select("_id");
        const ownedIds = products.map(p => p._id.toString());

        // Step 2: Fetch all orders containing any of admin's products
        const orders = await Order.find({
            "items._id": { $in: ownedIds }
        });

        // Step 3: Filter items inside each order
        const filteredOrders = orders.map(order => {
            const filteredItems = order.items.filter(item =>
                ownedIds.includes(item._id.toString())
            );

            return {
                ...order.toObject(),
                items: filteredItems
            };
        });

        // 🔥 Return SAME format as user: { orders: [...] }
        return res.status(200).json({ orders: filteredOrders });

    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { orderId,status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Only allow admin to change orders with their products
    const adminProducts = await Product.find({ owner: adminId }).select("_id");
    const ownedIds = adminProducts.map(p => p._id.toString());

    const hasProduct = order.items.some(item =>
      ownedIds.includes(item._id.toString())
    );
    if (!hasProduct) return res.status(403).json({ message: "Not allowed" });

    // Update order status
    order.status = status;
    await order.save();
    
    // Optionally: send email to user about status change

    res.status(200).json({ message: "Order status updated", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};




