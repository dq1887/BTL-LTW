const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Department = require("../src/models/Department");
const Employee = require("../src/models/Employee");

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(">>> Đã kết nối MongoDB Atlas thành công!");
    await Department.deleteMany({});
    await Employee.deleteMany({});
    console.log(">>> Đã làm sạch dữ liệu cũ!");

    const departments = await Department.insertMany([
      {
        departmentCode: "DEP_HR",
        name: "Phòng Hành chính Nhân sự",
        description: "Quản lý nhân sự và chính sách",
      },
      {
        departmentCode: "DEP_IT",
        name: "Phòng Công nghệ thông tin",
        description: "Phát triển phần mềm và hệ thống",
      },
      {
        departmentCode: "DEP_MKT",
        name: "Phòng Marketing",
        description: "Truyền thông và quảng bá sản phẩm",
      },
      {
        departmentCode: "DEP_SALES",
        name: "Phòng Kinh doanh",
        description: "Bán hàng và phát triển thị trường",
      },
      {
        departmentCode: "DEP_ACC",
        name: "Phòng Kế toán",
        description: "Quản lý tài chính và lương thưởng",
      },
    ]);
    console.log(">>> Đã tạo 5 phòng ban mẫu!");

    const hashedPassword = await bcrypt.hash("123456", 10);

    const sampleNames = [
      "Dương Hoài Nam",
      "Nguyễn Văn An",
      "Trần Thị Bình",
      "Phạm Quốc Cường",
      "Lê Minh Dũng",
      "Hoàng Thu Hà",
      "Vũ Hải Đăng",
      "Đặng Thị Mai",
      "Bùi Đức Anh",
      "Đỗ Ngọc Trinh",
      "Hồ Thành Nam",
      "Ngô Kim Oanh",
      "Dương Tuấn Anh",
      "Lý Hoài Phương",
      "Phan Bảo Long",
      "Võ Thị Lan",
      "Trịnh Quang Minh",
      "Đoàn Thanh Sơn",
      "Lương Hoàng Long",
      "Trương Khánh Linh",
      "Đinh Văn Hùng",
      "Nguyễn Mẫn Nhi",
      "Trần Việt Anh",
      "Phạm Hồng Nhung",
      "Lê Minh Trí",
      "Hoàng Thu Trang",
      "Vũ Nhật Minh",
      "Đặng Phương Thảo",
      "Bùi Gia Huy",
      "Đỗ Bích Ngọc",
      "Hồ Tấn Phát",
      "Ngô Mỹ Linh",
      "Dương Minh Quân",
      "Lý Như Quỳnh",
      "Phan Tiến Đạt",
      "Võ Anh Thư",
      "Trịnh Duy Khánh",
      "Đoàn Kim Ngân",
      "Lương Hoàng Phúc",
      "Trương Hải Yến",
      "Đinh Hữu Thắng",
      "Nguyễn Thùy Linh",
      "Trần Văn Khoa",
      "Phạm Thanh Hà",
      "Lê Trọng Nghĩa",
      "Hoàng Mai Phương",
      "Vũ Đức Minh",
      "Đặng Vân Anh",
      "Bùi Quốc Khánh",
      "Nguyễn Thu Thủy",
    ];

    const removeAccents = (str) => {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
    };

    const employees = sampleNames.map((name, index) => {
      const codeNum = String(index + 1).padStart(3, "0");
      const employeeCode = `EMP${codeNum}`;

      const cleanName = removeAccents(name).toLowerCase().split(" ");
      const firstName = cleanName[cleanName.length - 1];
      const lastName = cleanName[0];
      const email = `${firstName}.${lastName}${index + 1}@gmail.com`;

      let role = "employee";
      if (index === 0) role = "admin_hr";
      else if (index <= 5) role = "manager";

      const dept = departments[index % departments.length];

      return {
        employeeCode,
        fullName: name,
        email,
        password: hashedPassword,
        role,
        departmentId: dept._id,
        baseSalary: 10000000 + index * 500000,
        status: "active",
      };
    });

    await Employee.insertMany(employees);
    console.log(`>>> Đã nạp thành công 50 nhân viên vào Database!`);

    process.exit();
  } catch (error) {
    console.error("Lỗi khi nạp dữ liệu:", error);
    process.exit(1);
  }
};

seedData();
