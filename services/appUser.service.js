import AppUser from "../models/AppUser.module.js";

class AppUserService {
  async findById(id) {
    return await AppUser.findById(id);
  }

  async findOne(filter) {
    return await AppUser.findOne(filter);
  }

  async findByEmail(email) {
    return await AppUser.findOne({ email: email.toLowerCase() });
  }

  async findByEmailWithRole(email, role) {
    return await AppUser.findOne({ 
      email: email.toLowerCase(), 
      roles: role 
    });
  }

  async create(userData) {
    return await AppUser.create(userData);
  }

  async update(id, updateData) {
    return await AppUser.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await AppUser.findByIdAndDelete(id);
  }

  async findAll(filter = {}) {
    return await AppUser.find(filter);
  }

  async exists(email) {
    const user = await AppUser.findOne({ email: email.toLowerCase() });
    return !!user;
  }

  async updateRoles(id, roles) {
    return await AppUser.findByIdAndUpdate(
      id,
      { roles },
      { new: true, runValidators: true }
    );
  }

  async toggleActiveStatus(id) {
    const user = await AppUser.findById(id);
    if (!user) return null;
    
    user.isActive = !user.isActive;
    return await user.save();
  }

  async setActiveStatus(id, isActive) {
    return await AppUser.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );
  }
}

export default new AppUserService();