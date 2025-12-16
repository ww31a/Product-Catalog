import Order from "../models/order.module.js";
import Product from "../models/products.module.js";

export const getSellerOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;

        // Step 1: Get product IDs owned by this seller
        const products = await Product.find({ owner: sellerId }).select("_id");
        const ownedIds = products.map(p => p._id.toString());

        // Step 2: Fetch all orders that contain any of this seller’s products
        const orders = await Order.find({
            "items._id": { $in: ownedIds }
        }).sort({ createdAt: -1 });   // ⬅️ sorting added here

        // Step 3: Filter items + recalculate amount ONLY for seller's products
        const filteredOrders = orders.map(order => {
            const filteredItems = order.items.filter(item =>
                ownedIds.includes(item._id.toString())
            );

            // Recalculate amount for seller-only products
            const sellerAmount = filteredItems.reduce((sum, item) => {
                return sum + (item.price * item.quantity);
            }, 0);

            return {
                ...order.toObject(),
                items: filteredItems,
                amount: sellerAmount
            };
        });

        return res.status(200).json({ orders: filteredOrders });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};


export const updateOrderStatus = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { orderId, status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status === "cancelled") {
      return res.status(400).json({ 
        message: "Cannot update a cancelled order" 
      });
    }

    const sellerProducts = await Product.find({ owner: sellerId }).select("_id");
    const ownedIds = sellerProducts.map(p => p._id.toString());

    const hasProduct = order.items.some(item =>
      ownedIds.includes(item._id.toString())
    );
    if (!hasProduct) {
      return res.status(403).json({ 
        message: "Not allowed to update this order" 
      });
    }

    order.status = status;
    await order.save();
    
    res.status(200).json({ 
      message: "Order status updated successfully", 
      order 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};