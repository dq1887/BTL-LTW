const Schedule = require("../models/Schedule");
const Employee = require("../models/Employee");

// 1. Lấy danh sách lịch phân ca
const getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find()
      .populate("employeeId", "employeeCode fullName role")
      .populate("shiftId", "name startTime endTime breakMinutes");
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi server khi lấy lịch phân ca",
      error: error.message,
    });
  }
};

// 2. Tạo mới / Phân ca làm việc
const createSchedule = async (req, res) => {
  try {
    const { employeeId, shiftId, workDate } = req.body;

    // Kiểm tra xem lịch đã bị publish chưa (nếu cần quản lý khóa theo kỳ)
    // Tạo mới bản ghi phân ca
    const newSchedule = new Schedule({
      employeeId,
      shiftId,
      workDate,
      status: "draft",
    });

    await newSchedule.save();
    res.status(201).json({ message: "Phân ca thành công!", data: newSchedule });
  } catch (error) {
    // 🛡️ Quy tắc 2: Ràng buộc duy nhất (employeeId + workDate) -> Trả về lỗi 409 Conflict nếu trùng
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Lỗi 409: Nhân viên này đã được phân ca làm việc trong ngày này rồi!",
      });
    }
    res.status(500).json({
      message: "Lỗi server khi tạo lịch phân ca",
      error: error.message,
    });
  }
};

// 3. Cập nhật lịch phân ca
const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy lịch phân ca" });
    }

    // 🛡️ Quy tắc 4: Khóa lịch - Nếu đã published, chặn sửa tùy tiện
    if (schedule.status === "published") {
      return res.status(403).json({
        message: "Lịch đã được công bố (published), không cho phép chỉnh sửa!",
      });
    }

    const updatedSchedule = await Schedule.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res
      .status(200)
      .json({ message: "Cập nhật lịch thành công", data: updatedSchedule });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi server khi cập nhật lịch", error: error.message });
  }
};

// 4. Xóa lịch phân ca
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy lịch phân ca" });
    }

    // 🛡️ Quy tắc 4: Khóa lịch - Nếu đã published, chặn xóa
    if (schedule.status === "published") {
      return res.status(403).json({
        message: "Lịch đã được công bố (published), không cho phép xóa!",
      });
    }

    await Schedule.findByIdAndDelete(id);
    res.status(200).json({ message: "Xóa lịch phân ca thành công" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi server khi xóa lịch", error: error.message });
  }
};

// 5. Công bố lịch (Publish) để bàn giao sang module chấm công của TV3
const publishSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy lịch phân ca" });
    }

    schedule.status = "published";
    await schedule.save();

    res.status(200).json({
      message:
        "Đã công bố lịch thành công! Dữ liệu đã sẵn sàng bàn giao cho TV3 chấm công.",
      data: schedule,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi server khi công bố lịch", error: error.message });
  }
};

module.exports = {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  publishSchedule,
};
