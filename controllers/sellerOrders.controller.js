import OrderService from "../services/order.service.js";
import ProductService from "../services/product.service.js";
import UserService from '../services/user.service.js';
import AppUserService from "../services/appUser.service.js";
import { logActivity, logError } from "../utils/logger.js";

export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.auth.userId;

    const products = await ProductService.findByOwnerWithSelect(sellerId, "_id");
    const ownedIds = products.map(p => p._id.toString());

    const orders = await OrderService.findOrdersContainingProducts(ownedIds);

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
    logError({
      error,
      context: "Get Seller Orders",
      metadata: { sellerId: req.auth.userId, requestId: req.requestId }
    });
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const { orderId, status } = req.body;

    const order = await OrderService.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const oldStatus = order.status;
    if (order.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Cannot update a cancelled order" });
    }

    const sellerUser = await AppUserService.findById(sellerId);
    if (!sellerUser || !sellerUser.roles.includes("seller")) {
      return res.status(403).json({ success: false, message: "Not a seller" });
    }

    const sellerProducts = await ProductService.findByOwnerWithSelect(sellerId, "_id");
    const ownedIds = sellerProducts.map(p => p._id.toString());

    const hasProduct = order.items.some(item => ownedIds.includes(item._id.toString()));
    if (!hasProduct) {
      return res.status(403).json({ success: false, message: "Not allowed to update this order" });
    }

    const updatedOrder = await OrderService.updateStatus(order._id, status);

    if (status === "delivered" && updatedOrder.paymentMethod === "COD") {
      await OrderService.updatePaymentStatus(updatedOrder._id, true);
      updatedOrder.payment = true;
    }

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder
    });

    logActivity({
      email: sellerUser.email,
      user: sellerId,
      role: "Seller",
      status: "success",
      target: orderId,
      action: "UPDATE_ORDER_STATUS",
      message: `Order status updated from ${oldStatus} to ${status}`,
      metadata: { orderId, oldStatus, newStatus: status, requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });
  } catch (err) {
    logError({
      error: err,
      context: "Update Order Status",
      metadata: { orderId: req.body.orderId, sellerId: req.auth.userId, requestId: req.requestId }
    });
    res.status(500).json({ success: false, message: err.message });
  }
};
