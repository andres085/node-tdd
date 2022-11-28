class ValidationError extends Error {
  constructor(errors) {
    super();
    this.status = 400;
    this.errors = errors;
    this.message = "VALIDATION_FAILURE";
  }
}

module.exports = ValidationError;
