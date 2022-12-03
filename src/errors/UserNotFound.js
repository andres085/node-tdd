class UserNotFoundError extends Error {
  constructor(errors) {
    super();
    this.status = 404;
    this.errors = errors;
    this.message = "USER_NOT_FOUND";
  }
}

module.exports = UserNotFoundError;
