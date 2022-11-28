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

const getUsers = async (page = 0) => {
  const pageSize = 10;
  const totalUsersWithCount = await User.findAndCountAll({
    where: { inactive: false },
    attributes: ["id", "username", "email"],
    limit: 10,
    offset: page * pageSize,
  });

  const pages = Math.ceil(totalUsersWithCount.count / pageSize);
  return {
    content: totalUsersWithCount.rows,
    page,
    size: pageSize,
    totalPages: pages,
  };
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
  getUsers,
};
