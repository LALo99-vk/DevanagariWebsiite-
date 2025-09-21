const fetch = require('node-fetch');

async function testPromo() {
    try {
        const response = await fetch('http://localhost:3001/api/promo/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: 'WELCOME10' })
        });

        console.log('Status:', response.status);
        console.log('Headers:', response.headers.raw());
        const data = await response.text();
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testPromo();
