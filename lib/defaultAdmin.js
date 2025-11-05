import bcrypt from "bcrypt";
import Admin from '../models/admin.module.js'

const createDefaultAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log(" Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Admin.create({
      name: "Default Admin",
      email,
      password: hashedPassword,
    });

    console.log("Default admin created");
  } catch (error) {
    console.error("Error creating default admin:", error.message);
  }
};

export default createDefaultAdmin;
