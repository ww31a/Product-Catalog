import Order from "../models/order.module.js";
import Product from "../models/products.module.js";

export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.auth.userId; // use new auth object

    // Step 1: Get product IDs owned by this seller
    const products = await Product.find({ owner: sellerId }).select("_id");
    const ownedIds = products.map(p => p._id.toString());

    // Step 2: Fetch all orders containing any seller's products
    const orders = await Order.find({
      "items._id": { $in: ownedIds }
    }).sort({ createdAt: -1 });

    // Step 3: Filter items + recalculate amount for seller's products only
    const filteredOrders = orders.map(order => {
      const filteredItems = order.items.filter(item =>
        ownedIds.includes(item._id.toString())
      );

      const sellerAmount = filteredItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      return {
        ...order.toObject(),
        items: filteredItems,
        amount: sellerAmount
      };
    });

    res.status(200).json({ success: true, orders: filteredOrders });
  } catch (error) {
    console.error("getSellerOrders error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const sellerId = req.auth.userId; // updated auth
    const { orderId, status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Cannot update a cancelled order" });
    }

    // Get seller's product IDs
    const sellerProducts = await Product.find({ owner: sellerId }).select("_id");
    const ownedIds = sellerProducts.map(p => p._id.toString());

    // Check if order contains any of seller's products
    const hasProduct = order.items.some(item =>
      ownedIds.includes(item._id.toString())
    );

    if (!hasProduct) {
      return res.status(403).json({ success: false, message: "Not allowed to update this order" });
    }

    order.status = status;
    await order.save();

    res.status(200).json({ success: true, message: "Order status updated successfully", order });
  } catch (err) {
    console.error("updateOrderStatus error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
