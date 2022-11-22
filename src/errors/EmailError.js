class EmailError extends Error {
  constructor() {
    super();
    this.message = "EMAIL_FAILURE";
  }
}

module.exports = EmailError;
