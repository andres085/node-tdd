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
    return res.status(400).json({
      validationErrors: { email: "E-mail in use" },
    });
  }
};

module.exports = { postUser };
