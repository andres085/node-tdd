const pagination = (req, res, next) => {
  const pageAsNumber = +req.query.page;
  const sizeAsNumber = +req.query.size;
  let page = Number.isNaN(pageAsNumber) ? 0 : pageAsNumber;
  let size = Number.isNaN(sizeAsNumber) ? 10 : sizeAsNumber;
  if (size > 10 || size < 1) {
    size = 10;
  }
  req.pagination = { size, page };
  next();
};

module.exports = pagination;
