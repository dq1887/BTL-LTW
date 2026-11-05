const Employee = require('../models/Employee');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Kiểm tra xem email có tồn tại không
        const employee = await Employee.findOne({ email });
        if (!employee) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        // 2. Kiểm tra mật khẩu (Nếu có dùng bcrypt thì so sánh bằng bcrypt.compare)
        if (employee.password !== password) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        // 3. Tạo Token JWT
        const token = jwt.sign(
            { id: employee._id, role: employee.role },
            process.env.JWT_SECRET || 'HRM_SECRET_KEY',
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.status(200).json({
            token,
            user: {
                id: employee._id,
                name: employee.name,
                email: employee.email,
                role: employee.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { login };
