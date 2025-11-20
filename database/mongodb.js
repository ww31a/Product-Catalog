import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(MONGODB_URI);

    console.log("Database Connected");
  } catch (err) {
    console.error("MongoDB connection failed", err.message);
    process.exit(1); 
  }
};

export default connectDB;
