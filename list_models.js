
require('dotenv').config();

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('No API Key found in .env');
        return;
    }

    // The endpoint to list models
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('List Models Error:', response.status, await response.text());
            return;
        }

        const data = await response.json();
        const models = data.models || [];
        console.log('Available Models:');
        console.log(models.map(m => `${m.name} (${m.supportedGenerationMethods.join(', ')})`).join('\n'));

    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

listModels();
