const userService = require("../services/user.service");

const postUser = async (req, res) => {
  if (req.validationErrors) {
    return res.status(400).json({ validationErrors: req.validationErrors });
  }
  try {
    await userService.save(req.body);

    return res.status(200).json({
      message: req.t("USER_SUCCESS"),
    });
  } catch (error) {
    return res.status(502).json({
      message: req.t(error.message),
    });
  }
};

const activateUser = async (req, res) => {
  try {
    await userService.activate(req.params);
    return res.status(200).json({
      message: req.t("ACCOUNT_ACTIVATION_SUCCESS"),
    });
  } catch (error) {
    return res.status(400).json({
      message: req.t(error.message),
    });
  }
};

module.exports = { postUser, activateUser };
