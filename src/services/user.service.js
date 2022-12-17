const bcrypt = require("bcrypt");
const User = require("../models/User");
const crypto = require("crypto");
const emailService = require("../email/emailService");
const sequelize = require("../config/database");
const Sequelize = require("sequelize");
const EmailError = require("../errors/EmailError");
const InvalidTokenError = require("../errors/InvalidTokenError");
const UserNotFound = require("../errors/UserNotFound");
const ForbiddenError = require("../errors/ForbiddenError");

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
  return await User.findOne({ where: { email }, attributes: ["id", "username", "email", "password", "inactive"] });
};

const getUsers = async (page = 0, size = 10, authenticatedUser) => {
  page = page < 0 ? 0 : page;
  const totalUsersWithCount = await User.findAndCountAll({
    where: {
      inactive: false,
      id: {
        [Sequelize.Op.not]: authenticatedUser ? authenticatedUser.id : 0,
      },
    },
    attributes: ["id", "username", "email"],
    limit: size,
    offset: page * size,
  });

  const pages = Math.ceil(totalUsersWithCount.count / size);
  return {
    content: totalUsersWithCount.rows,
    page,
    size,
    totalPages: pages,
  };
};

const getUser = async (id) => {
  const user = await User.findOne({ where: { id, inactive: false }, attributes: ["id", "username", "email"] });
  if (!user) {
    throw new UserNotFound();
  }
  return user;
};

const updateUser = async (id, body) => {
  const updatedUser = await User.update(body, {
    where: { id: id },
  });

  return updatedUser;
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
  getUser,
  updateUser,
};
