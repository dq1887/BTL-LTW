const path = require("path");
const dns = require("dns");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config({ path: path.join(__dirname, ".env") });

const recalculateAll = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb+srv://admin:admin@hrm-database.87l2z1y.mongodb.net/EmployeeManagement?retryWrites=true&w=majority";

    console.log(">>> Đang kết nối MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log(">>> Đã kết nối thành công!");

    const collectionsToFix = ["attendances", "attendanceadjustments"];

    for (const colName of collectionsToFix) {
      const col = mongoose.connection.db.collection(colName);
      const records = await col.find({ checkOutAt: { $ne: null } }).toArray();

      if (records.length === 0) continue;
      console.log(
        `>>> Đang xử lý ${records.length} bản ghi tại collection '${colName}'...`,
      );

      for (const record of records) {
        if (record.checkInAt && record.checkOutAt) {
          const inTime = new Date(record.checkInAt).getTime();
          let outTime = new Date(record.checkOutAt).getTime();

          if (outTime < inTime) {
            outTime += 24 * 60 * 60 * 1000;
          }

          const diffMs = outTime - inTime;
          const minutesWorked = Math.max(0, Math.floor(diffMs / (1000 * 60)));

          const workCredit = Math.round((minutesWorked / 480) * 10) / 10;

          await col.updateOne(
            { _id: record._id },
            { $set: { minutesWorked, workCredit } },
          );
        }
      }
    }

    console.log("✅ HOÀN TẤT: Toàn bộ dữ liệu đã được tính lại chuẩn xác!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    process.exit(1);
  }
};

recalculateAll();
