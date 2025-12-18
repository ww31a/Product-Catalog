import SuperAdmin from "../models/superAdmin.module.js";

class SuperAdminService {
  // USED: superAdmin controller
  async findById(id) {
    return await SuperAdmin.findById(id);
  }

  // USED: superAdmin controller
  async findByEmail(email) {
    return await SuperAdmin.findOne({ email: email.toLowerCase() });
  }

  // USED: superAdmin controller
  async updatePassword(id, newPassword) {
    return await SuperAdmin.findByIdAndUpdate(
      id,
      { password: newPassword },
      { new: true }
    );
  }

  // USED: superAdmin controller
  async findByIdWithSelect(id, selectFields = "") {
    return await SuperAdmin.findById(id).select(selectFields);
  }
}

export default new SuperAdminService();