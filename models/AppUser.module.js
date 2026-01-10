import mongoose from "mongoose";

const appUserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        roles: {
            type: [String],
            enum: ["user", "seller"],
            default: ["user"]
        },

        isVerified: {
            type: Boolean,
            default: false
        },
        verificationCode: {
            type: String
        },
        verificationCodeExpiresAt: {
            type: Date
        }
    },
    { timestamps: true, minimize: false }
);

const AppUser = mongoose.model("AppUser", appUserSchema);
export default AppUser;
