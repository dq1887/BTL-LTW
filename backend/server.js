const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Đường dẫn test thử server
app.get('/', (req, res) => {
    res.send('HRM Backend Server is running...');
});

// Kết nối MongoDB Atlas và chạy Server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('>>> Đã kết nối MongoDB Atlas thành công!');
        app.listen(PORT, () => {
            console.log(`>>> Server Backend đang chạy tại http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Lỗi kết nối MongoDB:', err);
    });