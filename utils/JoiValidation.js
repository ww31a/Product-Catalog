import Joi from "joi";

const signupSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
        .min(8)
        .max(20) // max length added
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,20}$/)
        .required()
        .messages({
            "string.pattern.base":
                "Password must be at least 8 characters long, include 1 uppercase, 1 lowercase, and 1 special character",
            "string.min": "Password must be at least 8 characters long",
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
            .pattern(/^[0-9]{11}$/) // exactly 11 digits
            .required()
            .messages({
                'string.empty': 'Phone number is required',
                'string.pattern.base': 'Phone must be exactly 11 digits (e.g., 03001234567)',
                'any.required': 'Phone number is required'
            }),

        address: Joi.string()
            .required()
            .trim()
            .min(5)
            .max(200)
            .messages({
                "string.empty": "Address is required",
                "string.min": "Address must be at least 5 characters",
                "string.max": "Address cannot exceed 200 characters",
                "any.required": "Address is required"
            }),

        city: Joi.string()
            .required()
            .trim()
            .min(2)
            .max(50)
            .messages({
                "string.empty": "City is required",
                "string.min": "City must be at least 2 characters",
                "string.max": "City cannot exceed 50 characters",
                "any.required": "City is required"
            })
    })
        .required()
        .messages({
            'any.required': 'Address object is required',
            'object.base': 'Address must be a valid object'
        })
});

export { signupSchema, orderSchema };
