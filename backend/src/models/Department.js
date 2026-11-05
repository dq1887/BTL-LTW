const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true // Ví dụ: HR, IT, MKT
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);