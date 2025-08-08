const { body, validationResult } = require('express-validator');

exports.validateCreateOrganization = [
  body('organizationName').trim().isLength({ min: 3 }),
  body('username').isAlphanumeric().withMessage('Username must be alphanumeric'),
  body('password').isStrongPassword(),
  body('email').isEmail().normalizeEmail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];