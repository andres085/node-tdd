const { verifyToken } = require("../utils/jwtUtil");

const tokenAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (authorization) {
    const token = authorization.substring(7);
    const user = await verifyToken(token);

    req.authenticatedUser = user;
  }
  next();
};

module.exports = tokenAuthentication;
