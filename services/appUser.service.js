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

export default new AppUserService();