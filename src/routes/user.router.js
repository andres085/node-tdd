const express = require("express");
const router = express.Router();
const { postUser, activateUser, getUsers, getUser, updateUser } = require("../controllers/user.controller");
const pagination = require("../middlewares/pagination");
const tokenAuthentication = require("../middlewares/tokenAuthentication");
const basicAuthentication = require("../middlewares/basicAuthentication");
const validateUser = require("../middlewares/validateUser");

router.post("/", validateUser, postUser);
router.post("/token/:token", activateUser);

router.get("/", pagination, basicAuthentication, getUsers);
router.get("/:id", pagination, getUser);

router.put("/:id", tokenAuthentication, updateUser);

module.exports = router;
