const errorHandler = (err, req, res, next) => {
  const { status, message, errors } = err;
  let validationErrors;
  if (errors) {
    validationErrors = errors;
  }
  return res.status(status).json({
    message: req.t(message),
    validationErrors,
  });
};

module.exports = errorHandler;
