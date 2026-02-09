
// Native fetch is available in Node.js 18+

async function test() {
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
            })
        });

        if (!response.ok) {
            console.error('API Error:', response.status, await response.text());
            process.exit(1);
        }

        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch Error:', e);
        process.exit(1);
    }
}

test();
