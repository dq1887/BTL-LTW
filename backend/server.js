const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes API
app.use("/api/employees", require("./src/routes/employeeRoutes"));
app.use("/api/departments", require("./src/routes/departmentRoutes"));
app.use("/api/shifts", require("./src/routes/shiftRoutes"));
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/attendances", require("./src/routes/attendanceRoutes"));
app.use(
  "/api/attendance-adjustments",
  require("./src/routes/adjustmentRoutes"),
);
app.use("/api/payroll", require("./src/routes/payrollRoutes"));

app.get("/", (req, res) => {
  res.send("HRM Backend Server is running...");
});

const errorHandler = require("./src/middleware/errorMiddleware");
app.use(errorHandler);

// Kết nối MongoDB Atlas và chạy Server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log(">>> Đã kết nối MongoDB Atlas thành công!");
    app.listen(PORT, () => {
      console.log(`>>> Server Backend đang chạy tại http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Lỗi kết nối MongoDB:", err);
  });