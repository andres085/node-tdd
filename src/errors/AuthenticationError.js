class AuthenticationError extends Error {
  constructor(errors) {
    super();
    this.status = 401;
    this.errors = errors;
    this.message = "AUTHENTICATION_FAILURE";
  }
}

module.exports = AuthenticationError;
