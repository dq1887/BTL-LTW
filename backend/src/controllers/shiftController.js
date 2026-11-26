const Shift = require("../models/Shift");
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const getShifts = async (req, res) => {
  try {
    const shifts = await Shift.find().sort({ createdAt: -1 });
    res.status(200).json(shifts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({ message: "Không tìm thấy ca làm việc!" });
    }
    res.status(200).json(shift);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createShift = async (req, res) => {
  try {
    const { name, startTime, endTime, breakMinutes } = req.body;

    const existingShift = await Shift.findOne({ name });
    if (existingShift) {
      return res
        .status(409)
        .json({ message: "Tên ca làm việc này đã tồn tại!" });
    }

    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const totalDuration = endMins - startMins;

    if (startMins >= endMins) {
      return res.status(400).json({
        message: "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!",
      });
    }

    const breakMins = Number(breakMinutes) || 0;
    if (breakMins < 0 || breakMins >= totalDuration) {
      return res.status(400).json({
        message:
          "Thời gian nghỉ không được âm và phải nhỏ hơn tổng thời lượng ca!",
      });
    }

    const newShift = new Shift({
      name,
      startTime,
      endTime,
      breakMinutes: breakMins,
    });

    const savedShift = await newShift.save();
    res.status(201).json(savedShift);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateShift = async (req, res) => {
  try {
    const { startTime, endTime, breakMinutes } = req.body;

    if (startTime && endTime) {
      const startMins = timeToMinutes(startTime);
      const endMins = timeToMinutes(endTime);
      const totalDuration = endMins - startMins;

      if (startMins >= endMins) {
        return res.status(400).json({
          message: "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!",
        });
      }

      if (breakMinutes !== undefined) {
        const breakMins = Number(breakMinutes) || 0;
        if (breakMins < 0 || breakMins >= totalDuration) {
          return res.status(400).json({
            message:
              "Thời gian nghỉ không được âm và phải nhỏ hơn tổng thời lượng ca!",
          });
        }
      }
    }

    const updatedShift = await Shift.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedShift) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy ca làm việc để cập nhật!" });
    }

    res.status(200).json(updatedShift);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);
    if (!shift) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy ca làm việc để xóa!" });
    }
    res.status(200).json({ message: "Đã xóa ca làm việc thành công!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
};
