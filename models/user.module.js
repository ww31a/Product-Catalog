import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AppUser",
      required: true,
      unique: true
    },

    cartData: {
      type: Object,
      default: {}
    },

  },
  { timestamps: true, minimize: false }
);

const User = mongoose.model("User", userSchema);
export default User;
