document.addEventListener("DOMContentLoaded", function () {
    const chatbotContainer = document.getElementById("LUCAS-container");
    const closeBtn = document.getElementById("close-btn");
    const chatbotIcon = document.getElementById("LUCAS-by-T-Ying-icon");
    const ctaBtn = document.getElementById("cta-btn");
    const generateExamBtn = document.getElementById("generate-exam-btn");
    const examDisplay = document.getElementById("exam-display");
    const toggleAnswerBtn = document.getElementById("toggle-answer-btn");
    const answerToggleContainer = document.getElementById("answer-toggle-container");

    // ตัวแปรเก็บชื่อโมเดลที่ใช้งานได้ (จะถูกเติมอัตโนมัติ)
    let currentModel = "gemini-1.5-flash";
    let answersVisible = false;

    function openChat() {
        chatbotContainer.classList.remove("hidden");
        chatbotIcon.style.display = "none";
    }

    function closeChat() {
        chatbotContainer.classList.add("hidden");
        chatbotIcon.style.display = "flex";
    }

    if (chatbotIcon) chatbotIcon.addEventListener("click", openChat);
    if (closeBtn) closeBtn.addEventListener("click", closeChat);
    if (ctaBtn) ctaBtn.addEventListener("click", openChat);
    if (generateExamBtn) generateExamBtn.addEventListener("click", generateExam);
    if (toggleAnswerBtn) toggleAnswerBtn.addEventListener("click", toggleAnswers);

    async function generateExam() {
        const subject = document.getElementById("subject-select").value;
        const difficulty = document.getElementById("difficulty-select").value;
        const questionCount = document.getElementById("question-count").value;

        // Get subject name in Thai and English
        const subjectNames = {
            "physics": { th: "ฟิสิกส์", en: "Physics" },
            "chemistry": { th: "เคมี", en: "Chemistry" },
            "biology": { th: "ชีววิทยา", en: "Biology" },
            "earth-science": { th: "โลก ดาราศาสตร์และอวกาศ", en: "Earth and Space Science" }
        };

        const difficultyNames = {
            "easy": { th: "ง่าย", en: "Easy" },
            "medium": { th: "ปานกลาง", en: "Medium" },
            "hard": { th: "ยาก", en: "Hard" }
        };

        // Show loading message
        examDisplay.innerHTML = '<div class="loading-exam">🔬 Creating your exam... Please wait ⏳</div>';
        answerToggleContainer.style.display = "none";
        answersVisible = false;

        await generateExamWithAI(subject, difficulty, questionCount, subjectNames[subject], difficultyNames[difficulty]);
    }

    async function generateExamWithAI(subject, difficulty, questionCount, subjectName, difficultyName) {
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        //  ใส่ Key ของ Google Cloud / AI Studio ตรงนี้ gemini นั่นแหละคับ
        const apiKey = "AIzaSyDeBXHiGYGHEW9OfOdJNcEchHQ_eM8ZePg";
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////

        if (apiKey.includes("ใส่-API-KEY") || apiKey.length < 10) {
            examDisplay.innerHTML = '<div class="error-message">ขอกราบขอความกรุณาใส่ API Key ในไฟล์ script.js ก่อนขอรับคุณชาย</div>';
            return;
        }

        const systemInstruction = `You are a professional science exam generator. Create a high-quality ${difficultyName.en.toLowerCase()} level exam for ${subjectName.en} with exactly ${questionCount} questions.

FORMAT REQUIREMENTS:
1. Start with a title: "${subjectName.th} (${subjectName.en}) Exam - ${difficultyName.th}"
2. Include ${questionCount} questions total
3. Mix of question types: 70% multiple choice (4 options A-D), 30% short answer
4. For multiple choice: Clearly mark A, B, C, D options
5. Use clear numbering (1., 2., 3., etc.)
6. After all questions, add a separator line "══════════════════════════════════"
7. Then add "🔑 ANSWER KEY" section
8. List all answers clearly numbered
9. For multiple choice: Show correct letter and brief explanation
10. For short answer: Provide model answer and key points

CONTENT REQUIREMENTS:
- Questions must be scientifically accurate
- Use appropriate terminology for ${difficultyName.en.toLowerCase()} level
- Cover different topics within ${subjectName.en}
- Include calculations for ${subject === 'physics' || subject === 'chemistry' ? 'at least 30% of questions' : 'some questions'}
- Answers must be clear and educational

Generate the exam in Thai language with English scientific terms in parentheses where appropriate.`;

        try {
            await fetchExamResponse(apiKey, currentModel, systemInstruction);
        } catch (error) {
            console.warn("First attempt failed, trying to find available models...", error);

            try {
                const newModel = await findBestAvailableModel(apiKey);
                if (newModel) {
                    console.log("Switching to model:", newModel);
                    currentModel = newModel;
                    await fetchExamResponse(apiKey, newModel, systemInstruction);
                } else {
                    examDisplay.innerHTML = '<div class="error-message">❌ Error: API Key เข้าถึงโมเดลไม่ได้เลย (กรุณาเช็คว่าเปิด Generative Language API ใน Google Cloud หรือยัง)</div>';
                }
            } catch (retryError) {
                console.error("Retry failed:", retryError);
                examDisplay.innerHTML = '<div class="error-message">❌ Connection Failed: ' + (retryError.message || "Unknown Error") + '</div>';
            }
        }
    }

    async function fetchExamResponse(apiKey, model, prompt) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8000
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "API Error");
        }

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            const examContent = data.candidates[0].content.parts[0].text;
            displayExam(examContent);
        } else {
            examDisplay.innerHTML = '<div class="error-message">AI ไม่ตอบกลับ (No content generated)</div>';
        }
    }

    function displayExam(content) {
        // Split content into exam and answer key
        const parts = content.split(/══+|🔑\s*ANSWER KEY|ANSWER KEY/i);

        let examPart = parts[0] || content;
        let answerPart = parts.length > 1 ? parts.slice(1).join('\n') : '';

        // Format the exam display
        let formattedExam = examPart
            .replace(/^#{1,3}\s*(.+)$/gm, '<h2 class="exam-title">$1</h2>')
            .replace(/^\s*(\d+)\.\s*(.+)$/gm, '<div class="question"><span class="question-number">$1.</span> $2</div>')
            .replace(/^\s*([A-D])[.)]\s*(.+)$/gm, '<div class="option">$1. $2</div>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');

        let formattedAnswers = '';
        if (answerPart.trim()) {
            formattedAnswers = answerPart
                .replace(/^#{1,3}\s*(.+)$/gm, '<h3>$1</h3>')
                .replace(/^\s*(\d+)\.\s*(.+)$/gm, '<div class="answer-item"><span class="answer-number">$1.</span> $2</div>')
                .replace(/\n\n/g, '<br>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>');
        }

        examDisplay.innerHTML = `
            <div class="exam-section">
                ${formattedExam}
            </div>
            ${formattedAnswers ? `
                <div class="answer-section" id="answer-section" style="display: none;">
                    <div class="answer-divider">══════════════════════════════════</div>
                    <h3 class="answer-title">🔑 ANSWER KEY</h3>
                    ${formattedAnswers}
                </div>
            ` : ''}
        `;

        // Show answer toggle button if answers exist
        if (formattedAnswers) {
            answerToggleContainer.style.display = "block";
            answersVisible = false;
            toggleAnswerBtn.textContent = "Show Answer Key 🔑";
        }

        // Scroll to top of exam
        const lucasBody = document.getElementById("LUCAS-body");
        if (lucasBody) {
            lucasBody.scrollTop = lucasBody.scrollHeight;
        }
    }

    function toggleAnswers() {
        const answerSection = document.getElementById("answer-section");
        if (!answerSection) return;

        answersVisible = !answersVisible;

        if (answersVisible) {
            answerSection.style.display = "block";
            toggleAnswerBtn.textContent = "Hide Answer Key 🙈";
        } else {
            answerSection.style.display = "none";
            toggleAnswerBtn.textContent = "Show Answer Key 🔑";
        }

        // Scroll to answers if showing
        if (answersVisible) {
            answerSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // ฟังก์ชันค้นหาโมเดล
    async function findBestAvailableModel(apiKey) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();

            if (data.models) {
                const validModels = data.models.filter(m =>
                    m.supportedGenerationMethods &&
                    m.supportedGenerationMethods.includes("generateContent")
                );

                if (validModels.length > 0) {
                    const bestModel = validModels[0].name.replace("models/", "");
                    return bestModel;
                }
            }
        } catch (e) {
            console.error("Failed to list models:", e);
        }
        return null;
    }
});

// elements สำหรับสลับธีมคับ
const themeBtn = document.getElementById('theme-btn');
const themeLink = document.getElementById('theme-link');

// event listener สำหรับปุ่มสลับธีม
themeBtn.addEventListener('click', function () {
    const currentTheme = themeLink.getAttribute('href');

    if (currentTheme === 'style.css') {
        themeLink.setAttribute('href', 'cyber.css');
    } else {
        themeLink.setAttribute('href', 'style.css');
    }
});
