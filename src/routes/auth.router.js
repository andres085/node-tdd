const express = require("express");
const router = express.Router();
const { authUser } = require("../controllers/auth.controller");
const validateAuth = require("../validation/validateAuth");

router.post("/", validateAuth, authUser);

module.exports = router;
