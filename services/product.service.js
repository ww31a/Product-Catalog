import Product from "../models/products.module.js";
import mongoose from "mongoose";

class ProductService {
  // USED: cart controller, order controller, sellerProduct controller
  async findById(id) {
    return await Product.findById(id);
  }

  // USED: sellerProduct controller
  async create(productData) {
    return await Product.create(productData);
  }

  // USED: sellerProduct controller
  async update(id, updateData) {
    return await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  // USED: product controller
  async countDocuments(filter = {}) {
    return await Product.countDocuments(filter);
  }

  // USED: product controller
  async findByIdWithSelect(id, selectFields = "") {
    return await Product.findById(id).select(selectFields);
  }

  // USED: product controller
  async findAllWithSelect(filter = {}, selectFields = "", sort = { createdAt: -1 }) {
    return await Product.find(filter).select(selectFields).sort(sort);
  }

  // USED: product controller
  async findWithPagination(filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10, selectFields = "") {
    return await Product.find(filter)
      .select(selectFields)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  // USED: cart controller
  async findByIdsWithSelect(ids, selectFields = "") {
    return await Product.find({ _id: { $in: ids } }).select(selectFields);
  }

  // USED: order controller
  async decrementStock(id, amount) {
    return await Product.findByIdAndUpdate(
      id,
      { $inc: { stock: -amount } },
      { new: true }
    );
  }

  // USED: order controller (cancel order)
  async incrementStock(id, amount) {
    return await Product.findByIdAndUpdate(
      id,
      { $inc: { stock: amount } },
      { new: true }
    );
  }

  // USED: sellerProduct controller
  async updateStock(id, stock) {
    return await Product.findByIdAndUpdate(
      id,
      { stock },
      { new: true, runValidators: true }
    );
  }

  // USED: sellerProduct controller
  async findByOwner(ownerId) {
    return await Product.find({ owner: ownerId }).sort({ createdAt: -1 });
  }

  // USED: sellerInventory service, superAdminManagement service
  async findByOwnerWithSelect(ownerId, selectFields = "") {
    return await Product.find({ owner: ownerId }).select(selectFields);
  }

  // USED: sellerInventory service
  async findByOwnerAndIdsWithSelect(ownerId, ids, selectFields = "") {
    return await Product.find({
      _id: { $in: ids },
      owner: ownerId
    }).select(selectFields);
  }

  // USED: sellerInventory service
  async findLowStockByOwner(ownerId, threshold = 5) {
    return await Product.find({
      owner: ownerId,
      stock: { $gt: 0, $lte: threshold }
    })
      .populate('owner', 'name email')
      .sort({ stock: 1 });
  }

  // USED: sellerInventory service
  async findOutOfStockByOwner(ownerId) {
    return await Product.find({
      owner: ownerId,
      stock: 0
    })
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 });
  }

  // USED: sellerInventory service
  async findInStockByOwner(ownerId, threshold = 5) {
    return await Product.find({
      owner: ownerId,
      stock: { $gt: threshold }
    })
      .populate('owner', 'name email')
      .sort({ stock: -1 });
  }

  // USED: sellerInventory service
  async countByOwner(ownerId) {
    return await Product.countDocuments({ owner: ownerId });
  }

  // USED: sellerInventory service
  async countOutOfStockByOwner(ownerId) {
    return await Product.countDocuments({ owner: ownerId, stock: 0 });
  }

  // USED: sellerInventory service
  async countLowStockByOwner(ownerId, threshold = 5) {
    return await Product.countDocuments({
      owner: ownerId,
      stock: { $gt: 0, $lte: threshold }
    });
  }

  // USED: sellerInventory service
  async countInStockByOwner(ownerId, threshold = 5) {
    return await Product.countDocuments({
      owner: ownerId,
      stock: { $gt: threshold }
    });
  }

  // USED: sellerInventory service
  async getInventoryValueByOwner(ownerId) {
    const result = await Product.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(ownerId) } },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: { $multiply: ['$price', '$stock'] }
          },
          totalUnits: { $sum: '$stock' }
        }
      }
    ]);

    return result[0] || { totalValue: 0, totalUnits: 0 };
  }

  // USED: sellerInventory service
  async findDeadStock(productIds, excludeProductIds) {
    return await Product.find({
      _id: { $in: productIds, $nin: excludeProductIds },
      stock: { $gt: 0 }
    })
      .populate('owner', 'name email')
      .sort({ updatedAt: 1 });
  }

  // USED: sellerProduct controller
  async findByIdAndOwner(id, ownerId) {
    return await Product.findOne({ _id: id, owner: ownerId });
  }

  // USED: sellerProduct controller
  async deleteByIdAndOwner(id, ownerId) {
    return await Product.findOneAndDelete({ _id: id, owner: ownerId });
  }

  // USED: sellerProduct controller
  async bulkDeleteByOwner(productIds, ownerId) {
    return await Product.deleteMany({
      _id: { $in: productIds },
      owner: ownerId
    });
  }

  // USED: superAdminManagement service
  async deleteByOwner(ownerId) {
    return await Product.deleteMany({ owner: ownerId });
  }

  // USED: superAdminManagement service
  async deleteByOwners(ownerIds) {
    return await Product.deleteMany({ owner: { $in: ownerIds } });
  }

  // USED: superAdminManagement service
  async findByOwnersWithSelect(ownerIds, selectFields = "") {
    return await Product.find({ owner: { $in: ownerIds } }).select(selectFields);
  }

  // USED: superAdminManagement service
  async findWithPaginationAndPopulate(filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10, populateField = "", populateSelect = "") {
    return await Product.find(filter)
      .populate(populateField, populateSelect)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }
}

import { createLoggedService } from "../utils/serviceLogger.js";

export default createLoggedService("ProductService", new ProductService());