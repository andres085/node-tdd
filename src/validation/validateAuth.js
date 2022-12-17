const AuthenticationError = require("../errors/AuthenticationError");
const { check, validationResult } = require("express-validator");

const validateAuth = async (req, res, next) => {
  await check("email").notEmpty().withMessage("EMAIL_NULL").run(req);
  await check("password").notEmpty().withMessage("PASSWORD_NULL").run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AuthenticationError());
  }
  next();
};

module.exports = validateAuth;
