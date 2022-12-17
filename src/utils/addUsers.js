const sequelize = require("../config/database");
const User = require("../models/User");
const bcrypt = require("bcrypt");

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  const hashedPassword = await bcrypt.hash("P4ssword", 10);
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      password: hashedPassword,
      inactive: i >= activeUserCount,
    });
  }
};

sequelize.sync({ force: true }).then(async () => {
  await addUsers(25);
});

module.exports = addUsers;
