import StockHistory from "../models/stockHistory.module.js";

class StockHistoryService {
  async findById(id) {
    return await StockHistory.findById(id);
  }

  async findOne(filter) {
    return await StockHistory.findOne(filter);
  }

  async create(historyData) {
    return await StockHistory.create(historyData);
  }

  async findAll(filter = {}, sort = { createdAt: -1 }) {
    return await StockHistory.find(filter).sort(sort);
  }

  async findByProductId(productId, limit = null) {
    const query = StockHistory.find({ productId }).sort({ createdAt: -1 });
    return limit ? query.limit(limit) : query;
  }

  async findByProductIdWithPopulate(productId, populateFields = 'productId changedBy', limit = null) {
    const query = StockHistory.find({ productId })
      .populate(populateFields)
      .sort({ createdAt: -1 });
    return limit ? query.limit(limit) : query;
  }

  async findBySeller(sellerId) {
    return await StockHistory.find({ changedBy: sellerId }).sort({ createdAt: -1 });
  }

  async findBySellerWithPopulate(sellerId, populateFields = 'productId changedBy') {
    return await StockHistory.find({ changedBy: sellerId })
      .populate(populateFields)
      .sort({ createdAt: -1 });
  }

  async findByOrderId(orderId) {
    return await StockHistory.find({ orderId }).sort({ createdAt: -1 });
  }

  async findByType(type) {
    return await StockHistory.find({ type }).sort({ createdAt: -1 });
  }

  async findByReason(reason) {
    return await StockHistory.find({ reason }).sort({ createdAt: -1 });
  }

  async findByDateRange(startDate, endDate) {
    return await StockHistory.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: -1 });
  }

  async getProductStockSummary(productId) {
    return await StockHistory.aggregate([
      { $match: { productId } },
      {
        $group: {
          _id: "$type",
          totalChange: { $sum: "$change" },
          count: { $sum: 1 }
        }
      }
    ]);
  }

  async getSellerActivitySummary(sellerId) {
    return await StockHistory.aggregate([
      { $match: { changedBy: sellerId } },
      {
        $group: {
          _id: {
            type: "$type",
            reason: "$reason"
          },
          totalChange: { $sum: "$change" },
          count: { $sum: 1 }
        }
      }
    ]);
  }

  async delete(id) {
    return await StockHistory.findByIdAndDelete(id);
  }

  async deleteByProductId(productId) {
    return await StockHistory.deleteMany({ productId });
  }

  async countByProductIds(productIds, dateThreshold) {
    return await StockHistory.countDocuments({
      productId: { $in: productIds },
      createdAt: { $gte: dateThreshold }
    });
  }

  async countByProductIdsAndType(productIds, type, dateThreshold) {
    return await StockHistory.countDocuments({
      productId: { $in: productIds },
      type,
      createdAt: { $gte: dateThreshold }
    });
  }

  async getDistinctProductIds(productIds, dateThreshold) {
    return await StockHistory.distinct('productId', {
      productId: { $in: productIds },
      createdAt: { $gte: dateThreshold }
    });
  }
}

export default new StockHistoryService();