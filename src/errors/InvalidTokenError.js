class InvalidTokenError extends Error {
  constructor() {
    super();
    this.message = "ACCOUNT_ACTIVATION_FAILURE";
    this.status = 400;
  }
}

module.exports = InvalidTokenError;
