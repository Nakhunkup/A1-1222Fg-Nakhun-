document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 1. CONFIGURATION: ตั้งค่า API และ AI
    // =========================================================================
    // ⚠️ คำเตือน: ในการใช้งานจริง ควรเก็บ API Key ไว้ที่ Backend เพื่อความปลอดภัย
    // const API_KEY = 'AIzaSyCpCWTPPOW_BucuNzt7nr90dUZBTdIYLxA'; // ย้ายไปที่ .env แล้ว
    // const MODEL_NAME = "gemini-1.5-flash";
    const API_URL = '/api/chat'; // เรียกใช้ Backend แทน

    // กำหนดบุคลิกของ AI (System Prompt)
    const systemInstruction = `
        You are "MindCare Therapist AI", a compassionate and professional mental health assistant.
        - Your goal is to listen, validate feelings, and provide gentle emotional support.
        - Tone: Warm, safe, empathetic, and human-like.
        - Do not give medical prescriptions or diagnoses.
        - If the user mentions self-harm or suicide, kindly suggest professional emergency contacts.
        - Keep responses concise (2-4 sentences) unless asked for more details.
        - Support both Thai and English languages based on user input.
    `;

    // =========================================================================
    // 2. DOM ELEMENTS: อ้างอิง ID จาก HTML ของคุณ
    // =========================================================================
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const langToggle = document.getElementById('lang-toggle');

    // ตัวแปรเก็บประวัติการสนทนา (เพื่อความต่อเนื่อง)
    let chatHistory = [];

    // =========================================================================
    // 3. CORE FUNCTIONS: ฟังก์ชันหลักของ Chatbot
    // =========================================================================

    /**
     * ฟังก์ชันสร้างกล่องข้อความบนหน้าจอ
     * @param {string} text - ข้อความที่จะแสดง
     * @param {string} sender - ผู้ส่ง ('user' หรือ 'ai')
     */
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        // สร้าง Avatar ตาม HTML Guide
        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('message-avatar');
        avatarDiv.innerHTML = sender === 'user'
            ? '<i class="fa-regular fa-user"></i>'
            : '<i class="fa-solid fa-robot"></i>';

        // สร้างเนื้อหาข้อความ
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        // แปลง Newline (\n) เป็น <br> และจัดรูปแบบตัวหนา **text** เป็น <b>text</b>
        let formattedText = text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // รองรับ Markdown ตัวหนา

        contentDiv.innerHTML = formattedText;

        // จัดเรียง Element (User: ข้อความมาก่อนรูป, AI: รูปมาก่อนข้อความ)
        if (sender === 'ai') {
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(contentDiv);
        } else {
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(avatarDiv);
        }

        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    /**
     * ฟังก์ชันแสดงสถานะ "กำลังพิมพ์..."
     */
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'ai');
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="message-content" style="padding: 10px 15px;">
                <i class="fa-solid fa-ellipsis fa-fade"></i>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * เรียกใช้งาน Gemini API ผ่าน Backend
     */
    async function fetchGeminiResponse(userText) {
        try {
            // สร้าง Prompt โดยรวม System Instruction และข้อความปัจจุบัน
            const contents = [
                { role: "user", parts: [{ text: systemInstruction }] }, // System Prompt
                ...chatHistory, // ประวัติเก่า (ถ้ามี)
                { role: "user", parts: [{ text: userText }] } // ข้อความใหม่
            ];

            // เรียก Backend API แทนการเรียก Gemini โดยตรง
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: contents })
            });

            // อ่าน Response เป็น Text ก่อน เพื่อดูว่าเป็น HTML error หรือไม่
            const responseText = await response.text();

            if (!response.ok) {
                // ถ้า Status ไม่ใช่ 200 ให้แสดง Error พร้อม Status Code
                throw new Error(`Server Error (${response.status}): ${responseText.slice(0, 100)}...`);
            }

            // แปลง Text เป็น JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Invalid JSON response: ${responseText.slice(0, 100)}...`);
            }

            const aiText = data.candidates[0].content.parts[0].text;

            // บันทึกประวัติการคุย (Context)
            chatHistory.push({ role: "user", parts: [{ text: userText }] });
            chatHistory.push({ role: "model", parts: [{ text: aiText }] });

            return aiText;

        } catch (error) {
            console.error("Gemini Error:", error);
            const errorMessage = error.message || "Unknown error";
            return currentLang === 'th'
                ? `เกิดข้อผิดพลาด: ${errorMessage}`
                : `System Error: ${errorMessage}`;
        }
    }

    /**
     * จัดการเมื่อกดส่งข้อความ
     */
    async function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;

        // 1. UI: แสดงข้อความผู้ใช้ & เคลียร์ช่องพิมพ์
        addMessage(text, 'user');
        userInput.value = '';
        userInput.focus();

        // 2. UI: แสดง Typing Indicator
        showTypingIndicator();

        // 3. API: ส่งข้อมูลไปหา Gemini
        const aiResponse = await fetchGeminiResponse(text);

        // 4. UI: ลบ Typing Indicator และแสดงคำตอบ
        removeTypingIndicator();
        addMessage(aiResponse, 'ai');
    }

    // =========================================================================
    // 4. EVENT LISTENERS: การตอบสนองต่อผู้ใช้
    // =========================================================================

    if (sendBtn && userInput) {
        sendBtn.addEventListener('click', handleSend);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }

    // =========================================================================
    // 5. LANGUAGE SYSTEM: ระบบแปลภาษา (i18n)
    // =========================================================================
    const translations = {
        'en': {
            'nav-home': 'Home',
            'nav-therapist': 'Therapist AI',
            'nav-services': 'Services',
            'nav-contact': 'Contact',
            'btn-chat': 'Chat Now',
            'chat-header-title': 'MindCare Therapist AI',
            'chat-header-status': 'Always here to listen',
            'chat-header-online': 'Online',
            'chat-welcome': "Hello! I'm the MindCare Therapist AI. I'm here to listen and support you. How are you feeling today?",
            'chat-input-placeholder': 'Type your message here...'
        },
        'th': {
            'nav-home': 'หน้าแรก',
            'nav-therapist': 'นักบำบัด AI',
            'nav-services': 'บริการ',
            'nav-contact': 'ติดต่อเรา',
            'btn-chat': 'แชททันที',
            'chat-header-title': 'นักบำบัด AI MindCare',
            'chat-header-status': 'พร้อมรับฟังเสมอ',
            'chat-header-online': 'ออนไลน์',
            'chat-welcome': "สวัสดีค่ะ ฉันคือนักบำบัด AI ของ MindCare ยินดีรับฟังและอยู่เคียงข้างคุณเสมอ วันนี้คุณรู้สึกอย่างไรบ้างคะ?",
            'chat-input-placeholder': 'พิมพ์ข้อความของคุณที่นี่...'
        }
    };

    let currentLang = localStorage.getItem('careplus_lang') || 'en';

    function updateLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('careplus_lang', lang);

        // อัปเดตข้อความทั่วไป (innerHTML)
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang][key]) {
                // เช็คว่าเป็น Input หรือไม่
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translations[lang][key];
                } else {
                    // กรณีมี Icon อยู่ข้างใน (เช่น ปุ่ม Chat Now)
                    // เราจะเปลี่ยนแค่ Text Node โดยไม่ลบ Icon
                    if (el.children.length > 0) {
                        // วิธีอย่างง่าย: ถ้ามี icon ให้ใช้ innerHTML แบบ manual หรือใส่ span ใน HTML
                        // แต่เพื่อให้ง่ายต่อโค้ดนี้:
                        const iconHtml = el.querySelector('i') ? el.querySelector('i').outerHTML : '';
                        // กรณีปุ่ม Chat Now ไอคอนอยู่ขวา: Text + Icon
                        if (el.classList.contains('btn')) {
                            el.innerHTML = `<span>${translations[lang][key]}</span> ${iconHtml}`;
                        } else {
                            el.innerHTML = translations[lang][key];
                        }
                    } else {
                        el.innerHTML = translations[lang][key];
                    }
                }
            }
        });

        // อัปเดตปุ่มสลับภาษา
        if (langToggle) langToggle.textContent = lang === 'en' ? 'TH' : 'EN';
    }

    // เริ่มต้นภาษา
    updateLanguage(currentLang);

    // ปุ่มเปลี่ยนภาษา
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const newLang = currentLang === 'en' ? 'th' : 'en';
            updateLanguage(newLang);
        });
    }

    // Mobile Menu Toggle (จากโค้ดเดิมของคุณ)
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = navToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-xmark'); // ใช้ fa-xmark แทน fa-times ใน v6
            }
        });
    }
});