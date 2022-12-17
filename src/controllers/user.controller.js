const userService = require("../services/user.service");
const ValidationError = require("../errors/ValidationError");
const ForbiddenError = require("../errors/ForbiddenError");

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

const getUsers = async (req, res) => {
  const authenticatedUser = req.authenticatedUser;
  const { page, size } = req.pagination;
  const users = await userService.getUsers(page, size, authenticatedUser);
  return res.status(200).json(users);
};

const getUser = async (req, res, next) => {
  try {
    const userFound = await userService.getUser(req.params.id);
    return res.status(200).json(userFound.dataValues);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser;
  const body = req.body;

  try {
    if (!authenticatedUser || authenticatedUser.id !== +req.params.id) {
      throw new ForbiddenError("UNAUTHORIZED_USER_UPDATE");
    }
    await userService.updateUser(authenticatedUser.id, body);
    return res.status(200).json();
  } catch (error) {
    next(error);
  }
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

module.exports = { postUser, activateUser, getUsers, getUser, updateUser };
