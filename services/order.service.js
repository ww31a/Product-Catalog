import Order from "../models/order.module.js";

class OrderService {
  async findById(id) {
    return await Order.findById(id);
  }

  async findOne(filter) {
    return await Order.findOne(filter);
  }

  async findByOrderId(orderId) {
    return await Order.findOne({ orderId });
  }

  async findByUserId(userId) {
    return await Order.find({ userId }).sort({ createdAt: -1 });
  }

  async create(orderData) {
    return await Order.create(orderData);
  }

  async update(id, updateData) {
    return await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  async updateByOrderId(orderId, updateData) {
    return await Order.findOneAndUpdate(
      { orderId },
      updateData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await Order.findByIdAndDelete(id);
  }

  async deleteByOrderId(orderId) {
    return await Order.findOneAndDelete({ orderId });
  }

  async findAll(filter = {}, sort = { createdAt: -1 }) {
    return await Order.find(filter).sort(sort);
  }

  async updateStatus(orderId, status) {
    return await Order.findOneAndUpdate(
      { orderId },
      { status },
      { new: true, runValidators: true }
    );
  }

  async updatePaymentStatus(orderId, payment) {
    return await Order.findOneAndUpdate(
      { orderId },
      { payment },
      { new: true }
    );
  }

  async findByStatus(status) {
    return await Order.find({ status }).sort({ createdAt: -1 });
  }

  async findByDateRange(startDate, endDate) {
    return await Order.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
  }

  async countByStatus(status) {
    return await Order.countDocuments({ status });
  }

  async getTotalRevenue(filter = {}) {
    const result = await Order.aggregate([
      { $match: { payment: true, ...filter } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    return result[0]?.total || 0;
  }

  async getUserOrderStats(userId) {
    return await Order.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);
  }

  async getBestSellingProductsForSeller(productIds, dateThreshold, limit = 10) {
    return await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          createdAt: { $gte: dateThreshold }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items._id': { $in: productIds }
        }
      },
      {
        $group: {
          _id: '$items._id',
          totalSold: { $sum: '$items.quantity' },
          salesCount: { $sum: 1 },
          totalRevenue: {
            $sum: { $multiply: ['$items.price', '$items.quantity'] }
          }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit }
    ]);
  }
}

export default new OrderService();