const bcrypt = require("bcrypt");
const userService = require("../services/user.service");

const basicAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (authorization) {
    const encoded = authorization.substring(6);
    const decoded = Buffer.from(encoded, "base64").toString("ascii");
    const [email, password] = decoded.split(":");
    const user = await userService.findByEmail(email);
    if (user && !user.inactive) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        req.authenticatedUser = user;
      }
    }
  }
  next();
};

module.exports = basicAuthentication;
