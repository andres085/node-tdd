const { findByEmail } = require("../services/user.service");
const bcrypt = require("bcrypt");
const AuthenticationError = require("../errors/AuthenticationError");
const ForbiddenError = require("../errors/ForbiddenError");

const authenticateUser = async (email, password) => {
  const userFound = await findByEmail(email);
  if (!userFound) {
    throw new AuthenticationError();
  }
  const isMatch = await bcrypt.compare(password, userFound.password);
  if (!isMatch) {
    throw new AuthenticationError();
  }
  if (userFound.inactive) {
    throw new ForbiddenError();
  }
  return userFound;
};

module.exports = { authenticateUser };
