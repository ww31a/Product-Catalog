import StockHistory from "../models/stockHistory.module.js";

class StockHistoryService {
  // USED: sellerProduct controller, order controller
  async create(historyData) {
    return await StockHistory.create(historyData);
  }

  // USED: superAdminManagement service
  async deleteByProductId(productId) {
    return await StockHistory.deleteMany({ productId });
  }

  // USED: superAdminManagement service
  async deleteByProductIds(productIds) {
    return await StockHistory.deleteMany({
      productId: { $in: productIds }
    });
  }

  // USED: sellerInventory service
  async countByProductIds(productIds, dateThreshold) {
    return await StockHistory.countDocuments({
      productId: { $in: productIds },
      createdAt: { $gte: dateThreshold }
    });
  }

  // USED: sellerInventory service
  async countByProductIdsAndType(productIds, type, dateThreshold) {
    return await StockHistory.countDocuments({
      productId: { $in: productIds },
      type,
      createdAt: { $gte: dateThreshold }
    });
  }

  // USED: sellerInventory service
  async getDistinctProductIds(productIds, dateThreshold) {
    return await StockHistory.distinct('productId', {
      productId: { $in: productIds },
      createdAt: { $gte: dateThreshold }
    });
  }

  // USED: superAdminManagement service
  async getTopSellersByRevenue(dateThreshold, limit = 10) {
    return await StockHistory.aggregate([
      {
        $match: {
          type: "remove",
          reason: "sale",
          createdAt: { $gte: dateThreshold }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.owner",
          totalRevenue: { $sum: { $multiply: ["$product.price", { $abs: "$change" }] } },
          totalItemsSold: { $sum: { $abs: "$change" } },
          orderCount: { $addToSet: "$orderId" }
        }
      },
      {
        $project: {
          sellerId: "$_id",
          totalRevenue: 1,
          totalItemsSold: 1,
          orderCount: { $size: "$orderCount" }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit }
    ]);
  }
}

import { createLoggedService } from "../utils/serviceLogger.js";

export default createLoggedService("StockHistoryService", new StockHistoryService());