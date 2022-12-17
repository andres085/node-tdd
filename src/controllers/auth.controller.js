const authService = require("../services/auth.service");
const { createToken } = require("../utils/jwtUtil");

const authUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await authService.authenticateUser(email, password);
    const token = createToken(user.id);
    return res.status(200).json({ id: user.id, username: user.username, token });
  } catch (error) {
    return next(error);
  }
};

module.exports = { authUser };
