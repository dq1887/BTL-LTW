const Schedule = require("../models/Schedule");
const Employee = require("../models/Employee");
const Shift = require("../models/Shift");
const mongoose = require("mongoose");

// 1. Lấy danh sách lịch phân ca
const getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find()
      .populate("employeeId", "employeeCode fullName role position")
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

    // Kiểm tra dữ liệu đầu vào
    if (
      !mongoose.isValidObjectId(employeeId) ||
      !mongoose.isValidObjectId(shiftId) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(workDate || "")
    ) {
      return res.status(400).json({
        message: "Thiếu nhân viên, ca làm việc hoặc ngày làm không hợp lệ!",
      });
    }

    // Nhân viên và ca phải tồn tại trong database
    const [employee, shift] = await Promise.all([
      Employee.exists({ _id: employeeId }),
      Shift.exists({ _id: shiftId }),
    ]);
    if (!employee || !shift) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy nhân viên hoặc ca làm việc!" });
    }

    // Tạo mới bản ghi phân ca (luôn ở trạng thái draft)
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

// 6. Tự động phân ca cho cả tuần (thứ 2 -> thứ 6), tạo ở trạng thái draft
const SHIFT_NAMES = {
  office: "Ca hành chính",
  morning: "Ca sáng",
  afternoon: "Ca chiều",
};
const OFFICE_ROLES = ["manager", "admin_hr"]; // làm ca hành chính

const pad2 = (n) => String(n).padStart(2, "0");
const toDateStr = (d) =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

const autoGenerateSchedules = async (req, res) => {
  try {
    const { weekStart } = req.body;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart || "")) {
      return res
        .status(400)
        .json({ message: "Ngày bắt đầu tuần không hợp lệ (YYYY-MM-DD)!" });
    }
    const base = new Date(`${weekStart}T00:00:00Z`);
    if (Number.isNaN(base.getTime())) {
      return res
        .status(400)
        .json({ message: "Ngày bắt đầu tuần không hợp lệ!" });
    }
    // Lùi về thứ 2 của tuần chứa ngày được gửi lên
    base.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
    const days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() + i);
      return toDateStr(d);
    });

    // Lấy 3 ca theo tên
    const shifts = await Shift.find({
      name: { $in: Object.values(SHIFT_NAMES) },
    })
      .select("_id name")
      .lean();
    const shiftId = {};
    for (const [key, name] of Object.entries(SHIFT_NAMES)) {
      const found = shifts.find((s) => s.name === name);
      if (!found) {
        return res
          .status(400)
          .json({
            message: `Chưa có ca "${name}" trong danh mục ca làm việc!`,
          });
      }
      shiftId[key] = found._id;
    }

    // Nhân sự đang làm việc (chưa có trường status thì vẫn tính)
    const employees = await Employee.find({
      $or: [{ status: "active" }, { status: { $exists: false } }],
    })
      .select("_id employeeCode role departmentId")
      .lean();

    // Manager/admin_hr -> hành chính; còn lại chia đều sáng/chiều theo phòng ban
    const assign = new Map(); // employeeId -> shiftId
    const byDept = {};
    for (const e of employees) {
      if (OFFICE_ROLES.includes(e.role)) {
        assign.set(String(e._id), shiftId.office);
      } else {
        const key = String(e.departmentId || "none");
        (byDept[key] = byDept[key] || []).push(e);
      }
    }
    for (const list of Object.values(byDept)) {
      list.sort((a, b) =>
        String(a.employeeCode).localeCompare(String(b.employeeCode), "en", {
          numeric: true,
        }),
      );
      const morningCount = Math.ceil(list.length / 2);
      list.forEach((e, i) =>
        assign.set(
          String(e._id),
          i < morningCount ? shiftId.morning : shiftId.afternoon,
        ),
      );
    }

    // Bỏ qua người đã có lịch trong ngày đó (tránh trùng khóa employeeId + workDate)
    const existing = await Schedule.find({ workDate: { $in: days } })
      .select("employeeId workDate")
      .lean();
    const taken = new Set(existing.map((x) => `${x.employeeId}_${x.workDate}`));

    const docs = [];
    for (const day of days) {
      for (const [empId, sId] of assign) {
        if (taken.has(`${empId}_${day}`)) continue;
        docs.push({
          employeeId: empId,
          shiftId: sId,
          workDate: day,
          status: "draft",
        });
      }
    }
    const total = assign.size * days.length;

    let created = 0;
    if (docs.length > 0) {
      try {
        const inserted = await Schedule.insertMany(docs, { ordered: false });
        created = inserted.length;
      } catch (err) {
        // Nếu có bản ghi trùng do thao tác song song, vẫn tính số đã tạo được
        if (err.code === 11000 || err.writeErrors) {
          created = err.insertedDocs ? err.insertedDocs.length : 0;
        } else {
          throw err;
        }
      }
    }

    res.status(201).json({
      message: `Đã tạo ${created} ca (bản nháp) cho tuần ${days[0]} → ${days[4]}${
        total - created > 0 ? `, bỏ qua ${total - created} ca đã có lịch` : ""
      }.`,
      created,
      skipped: total - created,
      weekStart: days[0],
      weekEnd: days[4],
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi server khi tự động phân ca",
      error: error.message,
    });
  }
};

module.exports = {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  publishSchedule,
  autoGenerateSchedules,
};
