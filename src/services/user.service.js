const bcrypt = require("bcrypt");
const User = require("../models/User");

const save = async (data) => {
  const { username, email, password } = data;
  let hashedPassword;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }
  await User.create({ username, email, password: hashedPassword });
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = {
  save,
  findByEmail,
};
