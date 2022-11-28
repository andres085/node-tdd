const userService = require("../services/user.service");
const ValidationError = require("../errors/ValidationError");

const postUser = async (req, res, next) => {
  if (req.validationErrors) {
    return next(new ValidationError(req.validationErrors));
  }
  try {
    await userService.save(req.body);

    return res.status(200).json({
      message: req.t("USER_SUCCESS"),
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  const page = req.query.page && req.query.page > 0 ? +req.query.page : 0;
  const users = await userService.getUsers(page);
  res.send(users);
};

const activateUser = async (req, res, next) => {
  try {
    await userService.activate(req.params);
    return res.status(200).json({
      message: req.t("ACCOUNT_ACTIVATION_SUCCESS"),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { postUser, activateUser, getUsers };
