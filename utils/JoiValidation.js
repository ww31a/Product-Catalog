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



const orderSchema = Joi.object({
    items: Joi.array()
        .min(1)
        .required()
        .messages({
            'array.min': 'Cart must contain at least one item',
            'any.required': 'Items are required'
        }),

    amount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.positive': 'Amount must be greater than 0',
            'any.required': 'Amount is required'
        }),

    address: Joi.object({
        name: Joi.string()
            .required()
            .messages({
                'string.empty': 'Name is required',
                'any.required': 'Name is required'
            }),

        email: Joi.string()
            .trim()
            .email()
            .required()
            .messages({
                'string.empty': 'Email is required',
                'string.email': 'Invalid email format',
                'any.required': 'Email is required'
            }),

        phone: Joi.string()
            .required()
            .messages({
                'string.empty': 'Phone number is required',
                'any.required': 'Phone number is required'
            }),

        address: Joi.string()
            .required()
            .messages({
                'string.empty': 'Address is required',
                'any.required': 'Address is required'
            }),

        city: Joi.string()
            .required()
            .messages({
                'string.empty': 'City is required',
                'any.required': 'City is required'
            })
    })
    .required()
    .messages({
        'any.required': 'Address object is required',
        'object.base': 'Address must be a valid object'
    })
});

export {signupSchema,orderSchema};
