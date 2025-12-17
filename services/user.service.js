import User from "../models/user.module.js";

class UserService {
  async findById(id) {
    return await User.findById(id);
  }

  async findOne(filter) {
    return await User.findOne(filter);
  }

  async findByUserId(userId) {
    return await User.findOne({ userId });
  }

  async findByUserIdWithPopulate(userId, populateFields = '') {
    return await User.findOne({ userId }).populate(populateFields);
  }

  async create(userData) {
    return await User.create(userData);
  }

  async update(id, updateData) {
    return await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  async updateByUserId(userId, updateData) {
    return await User.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await User.findByIdAndDelete(id);
  }

  async deleteByUserId(userId) {
    return await User.findOneAndDelete({ userId });
  }

  async findAll(filter = {}) {
    return await User.find(filter);
  }

  async updateCart(userId, cartData) {
    return await User.findOneAndUpdate(
      { userId },
      { cartData },
      { new: true, runValidators: true }
    );
  }

  async clearCart(userId) {
    return await User.findOneAndUpdate(
      { userId },
      { cartData: {} },
      { new: true }
    );
  }

  async getCart(userId) {
    const user = await User.findOne({ userId });
    return user ? user.cartData : {};
  }

  async addToCart(userId, itemId, quantity = 1) {
    const user = await User.findOne({ userId });
    if (!user) return null;

    const currentQty = user.cartData[itemId] || 0;
    user.cartData[itemId] = currentQty + quantity;
    user.markModified('cartData');
    return await user.save();
  }

  async removeFromCart(userId, itemId) {
    const user = await User.findOne({ userId });
    if (!user) return null;

    delete user.cartData[itemId];
    user.markModified('cartData');
    return await user.save();
  }

  async findByIdWithSelect(id, selectFields = "") {
    return await User.findById(id).select(selectFields);
  }

  async updateCartItem(userId, itemId, itemData) {
    return await User.findByIdAndUpdate(
      userId,
      { $set: { [`cartData.${itemId}`]: itemData } },
      { new: true }
    );
  }

  async removeCartItem(userId, itemId) {
    return await User.findByIdAndUpdate(
      userId,
      { $unset: { [`cartData.${itemId}`]: "" } },
      { new: true }
    );
  }
}

export default new UserService();