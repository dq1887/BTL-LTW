const express = require("express");
const router = express.Router();
const { login } = require("../controllers/authController");
router.post("/login", login);
const {
  changePassword,
  getLoginHistory,
} = require("../controllers/authController");

router.put("/change-password", changePassword);
router.get("/login-history", getLoginHistory);
module.exports = router;
