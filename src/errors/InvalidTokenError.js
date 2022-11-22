class InvalidTokenError extends Error {
  constructor() {
    super();
    this.message = "ACCOUNT_ACTIVATION_FAILURE";
  }
}

module.exports = InvalidTokenError;
