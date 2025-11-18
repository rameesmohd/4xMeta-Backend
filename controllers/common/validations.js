const Joi = require('joi');

// Joi schema for user data validation
const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(30).required().messages({
    'string.empty': 'First name is required',
    'string.min': 'First name should have at least 2 characters',
  }),
  lastName: Joi.string().min(2).max(30).required().messages({
    'string.empty': 'Last name is required',
    'string.min': 'Last name should have at least 2 characters',
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Invalid email format',
  }),
  country: Joi.string().min(2).required().messages({
    'string.empty': 'Country is required',
  }),
  countryCode: Joi.string().pattern(/^(\+\d{1,4})$/).required().messages({
    'string.pattern.base': 'Invalid country code format',
  }),
  mobile: Joi.string().min(7).max(15).required().messages({
    'string.min': 'Mobile number must be at least 7 digits',
    'string.max': 'Mobile number must be at most 15 digits',
    'string.empty': 'Mobile number is required',
  }),
  dateOfBirth: Joi.date().iso().required().messages({
    'date.iso': 'Invalid date of birth format',
  }),
  accountType: Joi.string().optional().allow(''),
  platform: Joi.string().optional().allow(''),
  leverage: Joi.string().optional().allow(''),
  referral: Joi.string().optional().allow(''),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password should have at least 8 characters',
    'string.empty': 'Password is required',
  }),
  confirmPassword: Joi.any().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

// Validation function
const validateRegister = (userData) => {
  const { error } = registerSchema.validate(userData, { abortEarly: false });
  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return { valid: false, errors };
  }
  return { valid: true };
};

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Invalid email format',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password should have at least 8 characters',
    'string.empty': 'Password is required',
  }),
  provider_account: Joi.string().allow('').optional(),
  provider_pass: Joi.string().allow('').optional(),
});

const validateLogin = (input) => {
  const { error } = loginSchema.validate(input);
  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return { valid: false, errors };
  }
  return { valid: true };
};


module.exports = {  
    validateRegister,
    validateLogin
};
