class EmailError extends Error {
  constructor() {
    super();
    this.message = "EMAIL_FAILURE";
    this.status = 502;
  }
}

module.exports = EmailError;
