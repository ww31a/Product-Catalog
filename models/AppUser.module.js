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
        },
        verificationCodeType: {
            type: String,
            enum: ["EMAIL_VERIFY", "LOGIN_2FA"],
            default: "EMAIL_VERIFY"
        }

    },
    { timestamps: true, minimize: false }
);

appUserSchema.index({ roles: 1 }); // If you query by role

const AppUser = mongoose.model("AppUser", appUserSchema);
export default AppUser;
