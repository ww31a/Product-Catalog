import Product from "../models/products.module.js";
import mongoose from "mongoose";

class ProductService {
  async findById(id) {
    return await Product.findById(id);
  }

  async findByIdWithPopulate(id, populateFields = 'owner') {
    return await Product.findById(id).populate(populateFields);
  }

  async findOne(filter) {
    return await Product.findOne(filter);
  }

  async create(productData) {
    return await Product.create(productData);
  }

  async update(id, updateData) {
    return await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await Product.findByIdAndDelete(id);
  }

  async findAll(filter = {}, sort = { createdAt: -1 }) {
    return await Product.find(filter).sort(sort);
  }

  async findAllWithPopulate(filter = {}, populateFields = 'owner', sort = { createdAt: -1 }) {
    return await Product.find(filter).populate(populateFields).sort(sort);
  }

  async findByOwner(ownerId) {
    return await Product.find({ owner: ownerId }).sort({ createdAt: -1 });
  }

  async findByCategory(category) {
    return await Product.find({ category }).sort({ createdAt: -1 });
  }

  async findByBrand(brand) {
    return await Product.find({ brand }).sort({ createdAt: -1 });
  }

  async search(searchTerm) {
    return await Product.find({
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { brand: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });
  }

  async updateStock(id, stock) {
    return await Product.findByIdAndUpdate(
      id,
      { stock },
      { new: true, runValidators: true }
    );
  }

  async incrementStock(id, amount) {
    return await Product.findByIdAndUpdate(
      id,
      { $inc: { stock: amount } },
      { new: true }
    );
  }

  async decrementStock(id, amount) {
    return await Product.findByIdAndUpdate(
      id,
      { $inc: { stock: -amount } },
      { new: true }
    );
  }

  async findLowStock(threshold = 10) {
    return await Product.find({ stock: { $lte: threshold } }).sort({ stock: 1 });
  }

  async findOutOfStock() {
    return await Product.find({ stock: 0 });
  }

  async findByPriceRange(minPrice, maxPrice) {
    return await Product.find({
      price: { $gte: minPrice, $lte: maxPrice }
    }).sort({ price: 1 });
  }

  async countByCategory(category) {
    return await Product.countDocuments({ category });
  }

  async getCategories() {
    return await Product.distinct('category');
  }

  async getBrands() {
    return await Product.distinct('brand');
  }

  async exists(id) {
    const product = await Product.findById(id);
    return !!product;
  }

  async countDocuments(filter = {}) {
    return await Product.countDocuments(filter);
  }

  async findByIdWithSelect(id, selectFields = "") {
    return await Product.findById(id).select(selectFields);
  }

  async findAllWithSelect(filter = {}, selectFields = "", sort = { createdAt: -1 }) {
    return await Product.find(filter).select(selectFields).sort(sort);
  }

  async findWithPagination(filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10, selectFields = "") {
    return await Product.find(filter)
      .select(selectFields)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async findByIdsWithSelect(ids, selectFields = "") {
    return await Product.find({ _id: { $in: ids } }).select(selectFields);
  }

  async findByOwnerWithSelect(ownerId, selectFields = "") {
    return await Product.find({ owner: ownerId }).select(selectFields);
  }

  async findByOwnerAndIdsWithSelect(ownerId, ids, selectFields = "") {
    return await Product.find({
      _id: { $in: ids },
      owner: ownerId
    }).select(selectFields);
  }

  async findLowStockByOwner(ownerId, threshold = 5) {
    return await Product.find({
      owner: ownerId,
      stock: { $gt: 0, $lte: threshold }
    })
      .populate('owner', 'name email')
      .sort({ stock: 1 });
  }

  async findOutOfStockByOwner(ownerId) {
    return await Product.find({
      owner: ownerId,
      stock: 0
    })
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 });
  }

  async findInStockByOwner(ownerId, threshold = 5) {
    return await Product.find({
      owner: ownerId,
      stock: { $gt: threshold }
    })
      .populate('owner', 'name email')
      .sort({ stock: -1 });
  }

  async countByOwner(ownerId) {
    return await Product.countDocuments({ owner: ownerId });
  }

  async countOutOfStockByOwner(ownerId) {
    return await Product.countDocuments({ owner: ownerId, stock: 0 });
  }

  async countLowStockByOwner(ownerId, threshold = 5) {
    return await Product.countDocuments({
      owner: ownerId,
      stock: { $gt: 0, $lte: threshold }
    });
  }

  async countInStockByOwner(ownerId, threshold = 5) {
    return await Product.countDocuments({
      owner: ownerId,
      stock: { $gt: threshold }
    });
  }

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

  async findDeadStock(productIds, excludeProductIds) {
    return await Product.find({
      _id: { $in: productIds, $nin: excludeProductIds },
      stock: { $gt: 0 }
    })
      .populate('owner', 'name email')
      .sort({ updatedAt: 1 });
  }
}

export default new ProductService();