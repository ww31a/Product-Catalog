import Seller from "../models/seller.module.js";

class SellerService {
  async findById(id) {
    return await Seller.findById(id);
  }

  async findByIdWithPopulate(id, populateFields = 'userId') {
    return await Seller.findById(id).populate(populateFields);
  }

  async findOne(filter) {
    return await Seller.findOne(filter);
  }

  async findByUserId(userId) {
    return await Seller.findOne({ userId });
  }

  async findByUserIdWithPopulate(userId, populateFields = 'userId') {
    return await Seller.findOne({ userId }).populate(populateFields);
  }

  async create(sellerData) {
    return await Seller.create(sellerData);
  }

  async update(id, updateData) {
    return await Seller.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  async updateByUserId(userId, updateData) {
    return await Seller.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await Seller.findByIdAndDelete(id);
  }

  async deleteByUserId(userId) {
    return await Seller.findOneAndDelete({ userId });
  }

  async findAll(filter = {}) {
    return await Seller.find(filter);
  }

  async findAllWithPopulate(filter = {}, populateFields = 'userId') {
    return await Seller.find(filter).populate(populateFields);
  }

  async exists(userId) {
    const seller = await Seller.findOne({ userId });
    return !!seller;
  }

  async count() {
    return await Seller.countDocuments();
  }

  async countDocuments(filter = {}) {
    return await Seller.countDocuments(filter);
  }

  async countSince(date) {
    return await Seller.countDocuments({ createdAt: { $gte: date } });
  }

  async findWithPagination(filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10, selectFields = "") {
    return await Seller.find(filter)
      .select(selectFields)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async bulkDelete(sellerIds) {
    return await Seller.deleteMany({ _id: { $in: sellerIds } });
  }

  async findByIdsWithSelect(sellerIds, selectFields = "") {
    return await Seller.find({ _id: { $in: sellerIds } }).select(selectFields);
  }
}

export default new SellerService();