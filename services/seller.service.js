import Seller from "../models/seller.module.js";

class SellerService {
  // USED: sellerAuth controller
  async create(sellerData) {
    return await Seller.create(sellerData);
  }

  // USED: superAdminManagement service
  async delete(id) {
    return await Seller.findByIdAndDelete(id);
  }

  async findByUserId(userId) {
    return await Seller.findOne({ userId });
  }

  // USED: superAdminManagement service
  async count() {
    return await Seller.countDocuments();
  }

  // USED: superAdminManagement service
  async countDocuments(filter = {}) {
    return await Seller.countDocuments(filter);
  }

  // USED: superAdminManagement service
  async countSince(date) {
    return await Seller.countDocuments({ createdAt: { $gte: date } });
  }

  // USED: superAdminManagement service
  async findWithPagination(filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10, selectFields = "") {
    return await Seller.find(filter)
      .select(selectFields)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  // USED: superAdminManagement service
  async bulkDelete(sellerIds) {
    return await Seller.deleteMany({ _id: { $in: sellerIds } });
  }

  // USED: superAdminManagement service
  async findByIdsWithSelect(sellerIds, selectFields = "") {
    return await Seller.find({ _id: { $in: sellerIds } }).select(selectFields);
  }
}

import { createLoggedService } from "../utils/serviceLogger.js";

export default createLoggedService("SellerService", new SellerService());