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

  // async updateStatus(orderId, status) {
  //   return await Order.findOneAndUpdate(
  //     { orderId },
  //     { status },
  //     { new: true, runValidators: true }
  //   );
  // }

  // async updatePaymentStatus(orderId, payment) {
  //   return await Order.findOneAndUpdate(
  //     { orderId },
  //     { payment },
  //     { new: true }
  //   );
  // }

  async updateStatus(id, status) {
    return await Order.findOneAndUpdate(
      { _id: id },           // ✅ filter object
      { status },
      { new: true, runValidators: true }
    );
  }

  async updatePaymentStatus(id, payment) {
    return await Order.findOneAndUpdate(
      { _id: id },           // ✅ filter object
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
      { $match: { payment: true, status: { $ne: 'cancelled' }, ...filter } },
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
    // Convert all productIds to strings to match order items
    const productIdsStr = productIds.map(id => id.toString());

    return await Order.aggregate([
      // Only delivered orders after the date threshold
      {
        $match: {
          status: 'delivered',
          createdAt: { $gte: dateThreshold }
        }
      },
      // Deconstruct items array
      { $unwind: '$items' },
      // Match only items that belong to this seller
      {
        $match: {
          'items._id': { $in: productIdsStr }
        }
      },
      // Group by item _id to calculate stats
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
      // Sort by quantity sold descending
      { $sort: { totalSold: -1 } },
      // Limit to top N products
      { $limit: limit }
    ]);
  }


  async findOrdersContainingProducts(productIds) {
    return await Order.find({
      "items._id": { $in: productIds }
    }).sort({ createdAt: -1 });
  }

  async count() {
    return await Order.countDocuments();
  }

  async countDocuments(filter = {}) {
    return await Order.countDocuments(filter);
  }

  async countSince(date) {
    return await Order.countDocuments({ createdAt: { $gte: date } });
  }

  async getRevenueStats() {
    const result = await Order.aggregate([
      { $match: { payment: true, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          averageOrderValue: { $avg: "$amount" }
        }
      }
    ]);
    return result[0] || { totalRevenue: 0, averageOrderValue: 0 };
  }

  async findWithPaginationAndPopulate(filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10, populateField = "", populateSelect = "") {
    return await Order.find(filter)
      .populate(populateField, populateSelect)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }
}

export default new OrderService();