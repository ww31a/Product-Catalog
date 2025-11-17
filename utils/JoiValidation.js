import Joi from "joi";

const signupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(6)
    .max(20) // max length added
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$"))
    .required()
    .messages({
      "string.pattern.base":
        "Password must be at least 6 characters long, include 1 uppercase, 1 lowercase, and 1 special character",
      "string.min": "Password must be at least 6 characters long",
      "string.max": "Password cannot exceed 20 characters",
    }),
});

export default signupSchema;
