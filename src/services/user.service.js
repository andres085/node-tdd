const bcrypt = require("bcrypt");
const User = require("../models/User");
const crypto = require("crypto");
const emailService = require("../email/emailService");
const sequelize = require("../config/database");
const EmailError = require("../errors/EmailError");
const InvalidTokenError = require("../errors/InvalidTokenError");

const generateToken = (length) => {
  return crypto.randomBytes(length).toString("hex").substring(0, length);
};

const save = async (data) => {
  const { username, email, password } = data;
  let hashedPassword;
  const transaction = await sequelize.transaction();
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }
  const user = { username, email, password: hashedPassword, activationToken: generateToken(16) };
  await User.create(user, { transaction });
  try {
    await emailService.sendActivationEmail(email, user.activationToken);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new EmailError();
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

const activate = async (data) => {
  const { token } = data;
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) {
    throw new InvalidTokenError();
  }
  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

module.exports = {
  save,
  findByEmail,
  activate,
};
