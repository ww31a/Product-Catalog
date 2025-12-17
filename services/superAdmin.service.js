import SuperAdmin from "../models/superAdmin.module.js";

class SuperAdminService {
  async findById(id) {
    return await SuperAdmin.findById(id);
  }

  async findOne(filter) {
    return await SuperAdmin.findOne(filter);
  }

  async findByEmail(email) {
    return await SuperAdmin.findOne({ email: email.toLowerCase() });
  }

  async create(adminData) {
    return await SuperAdmin.create(adminData);
  }

  async update(id, updateData) {
    return await SuperAdmin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await SuperAdmin.findByIdAndDelete(id);
  }

  async findAll(filter = {}) {
    return await SuperAdmin.find(filter);
  }

  async exists(email) {
    const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    return !!admin;
  }

  async count() {
    return await SuperAdmin.countDocuments();
  }

  async updatePassword(id, newPassword) {
    return await SuperAdmin.findByIdAndUpdate(
      id,
      { password: newPassword },
      { new: true }
    );
  }

  async findByIdWithSelect(id, selectFields = "") {
    return await SuperAdmin.findById(id).select(selectFields);
  }
}

export default new SuperAdminService();