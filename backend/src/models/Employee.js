const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    employeeCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        default: ''
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    position: {
        type: String,
        default: 'Nhân viên'
    },
    role: {
        type: String,
        enum: ['admin_hr', 'manager', 'employee'],
        default: 'employee'
    },
    salary: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);