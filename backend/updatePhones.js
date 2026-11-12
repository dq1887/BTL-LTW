require("dotenv").config();
const mongoose = require("mongoose");
const Employee = require("./src/models/Employee");

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/hrm_database";

const PREFIXES = [
  "098",
  "097",
  "096",
  "086",
  "032",
  "033",
  "034",
  "035",
  "036",
  "037",
  "038",
  "039",
  "090",
  "093",
  "070",
  "079",
  "077",
  "076",
  "078",
  "091",
  "094",
  "088",
  "083",
  "084",
  "085",
  "081",
  "082",
];

function generateUniquePhones(count) {
  const phoneSet = new Set();
  while (phoneSet.size < count) {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();
    phoneSet.add(`${prefix}${suffix}`);
  }
  return Array.from(phoneSet);
}

async function updateEmployeePhones() {
  try {
    console.log("⏳ Đang kết nối tới MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Kết nối MongoDB thành công!");

    const employees = await Employee.find({});
    console.log(`📋 Đã tìm thấy: ${employees.length} nhân viên.`);

    if (employees.length === 0) {
      console.log("⚠️ Không có nhân viên nào trong database.");
      process.exit(0);
    }

    const phoneList = generateUniquePhones(employees.length);

    console.log("⏳ Đang cập nhật số điện thoại cho từng nhân viên...");
    const updatePromises = employees.map((emp, index) => {
      return Employee.findByIdAndUpdate(
        emp._id,
        { $set: { phone: phoneList[index] } },
        { new: true },
      );
    });

    await Promise.all(updatePromises);
    console.log(
      `🎉 Đã cập nhật xong ${employees.length} số điện thoại khác nhau!`,
    );

    const sample = await Employee.find({})
      .limit(5)
      .select("fullName name email phone");
    console.log("\n🔍 Dữ liệu mẫu sau khi cập nhật:");
    console.table(
      sample.map((e) => ({
        ID: e._id.toString().slice(-6),
        Tên: e.fullName || e.name,
        SĐT: e.phone,
      })),
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
    process.exit(1);
  }
}

updateEmployeePhones();
