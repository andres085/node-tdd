const express = require("express");
const router = express.Router();
const { postUser, activateUser, getUsers } = require("../controllers/user.controller");
const { check, validationResult } = require("express-validator");
const userService = require("../services/user.service");

const validateUser = async (req, res, next) => {
  await check("username")
    .notEmpty()
    .withMessage("USERNAME_NULL")
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage("USERNAME_SIZE")
    .run(req);

  await check("email")
    .notEmpty()
    .withMessage("EMAIL_NULL")
    .bail()
    .isEmail()
    .withMessage("EMAIL_INVALID")
    .bail()
    .custom(async (email) => {
      const user = await userService.findByEmail(email);
      if (user) {
        throw new Error("EMAIL_IN_USE");
      }
    })
    .run(req);

  await check("password")
    .notEmpty()
    .withMessage("PASSWORD_NULL")
    .bail()
    .isLength({ min: 6 })
    .withMessage("PASSWORD_SIZE")
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage("PASSWORD_PATTERN")
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = {};
    errors.errors.forEach((error) => (validationErrors[error.param] = req.t(error.msg)));
    req.validationErrors = {
      ...validationErrors,
    };
  }
  next();
};

router.post("/", validateUser, postUser);
router.post("/token/:token", activateUser);

router.get("/", getUsers);

module.exports = router;
