// =========================================================================
// MindCare Therapy - Backend Server (Node.js + Express)
// =========================================================================
// วัตถุประสงค์: ซ่อน API Key และทำหน้าที่เป็นตัวกลางระหว่าง Frontend กับ Gemini API

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// โหลดค่าจาก .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // อนุญาตให้ Frontend เรียกใช้ได้
app.use(express.json()); // รับ JSON จาก Frontend
app.use(express.static('.')); // Serve static files (HTML, CSS, JS)

// =========================================================================
// API Endpoint: /api/chat
// =========================================================================
app.post('/api/chat', async (req, res) => {
    try {
        const { contents } = req.body;

        // ตรวจสอบว่ามี API Key หรือไม่
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                error: 'API Key ไม่ได้ถูกตั้งค่า กรุณาเพิ่ม GEMINI_API_KEY ใน .env file'
            });
        }

        // เรียก Gemini API
        const MODEL_NAME = process.env.MODEL_NAME || "gemini-1.5-flash";
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error:', errorData);
            return res.status(response.status).json({
                error: 'เกิดข้อผิดพลาดจาก Gemini API',
                details: errorData
            });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
            message: error.message
        });
    }
});

// =========================================================================
// เริ่มต้น Server
// =========================================================================
// =========================================================================
// เริ่มต้น Server (Local Development)
// =========================================================================
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✅ MindCare Backend Server กำลังทำงานที่ http://localhost:${PORT}`);
        console.log(`📝 API Endpoint: http://localhost:${PORT}/api/chat`);
        console.log(`🌐 เปิดเว็บไซต์ที่: http://localhost:${PORT}/index.html`);
    });
}

// Export the app for Vercel
module.exports = app;
// Export the app for Vercel
module.exports = app;
