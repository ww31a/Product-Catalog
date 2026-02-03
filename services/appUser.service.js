import AppUser from "../models/AppUser.module.js";

class AppUserService {
  // USED: auth controllers
  async findById(id) {
    return await AppUser.findById(id);
  }

  // USED: auth controllers
  async findByEmail(email) {
    return await AppUser.findOne({ email: email.toLowerCase() });
  }

  async findByEmailAndCode(email, code) {
    return await AppUser.findOne({
      email: email.toLowerCase(),
      verificationCode: code
    });
  }
  async findByAppUserIdWithSelect(userId, select) {
    return User.findOne({ appUserId: userId }).select(select);
  };

  async removeCartItem(userId, productId) {
    return User.updateOne(
      { appUserId: userId },
      { $unset: { [`cartData.${productId}`]: "" } }
    );
  };

  // USED: auth controllers (user/seller login)
  async findByEmailWithRole(email, role) {
    return await AppUser.findOne({
      email: email.toLowerCase(),
      roles: role
    });
  }

  // USED: auth controllers
  async create(userData) {
    return await AppUser.create(userData);
  }
}

import { createLoggedService } from "../utils/serviceLogger.js";

export default createLoggedService("AppUserService", new AppUserService());