const jwt = require("jsonwebtoken");
const secret = "ultra-secret-key";

const createToken = (id) => {
  return jwt.sign({ id }, secret);
};

const verifyToken = async (token) => {
  return await jwt.verify(token, secret);
};

module.exports = { createToken, verifyToken };
