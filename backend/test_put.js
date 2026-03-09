const fetch = require('node-fetch'); // or global fetch in Node 22

async function run() {
    console.log('Logging in...');
    const r1 = await fetch('http://localhost:4000/api/otp/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', mobile: '9999999999', otp: '123456' })
    });
    const d1 = await r1.json();
    const token = d1.token;
    console.log('Got token:', token ? 'Yes' : 'No');

    console.log('Sending Step A POST');
    const r2 = await fetch('http://localhost:4000/api/registrations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            businessType: 'PVT',
            proposedName1: 'Testing PUT',
            businessActivity: 'Test',
            registeredAddress: 'Test',
            capitalStructure: '1',
            companyMobile: '1',
            companyEmail: '1@1.com',
            directors: []
        })
    });
    const d2 = await r2.json();
    console.log('POST Result:', d2);
    const id = d2.id;

    if (id) {
        console.log('Sending Step B PUT to', id);
        const mockImage = 'data:image/jpeg;base64,' + 'A'.repeat(100000); // 100kb
        const r3 = await fetch('http://localhost:4000/api/registrations/' + id, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                directors: [{
                    name: 'Director 1',
                    pan: 'ABCDE1234F',
                    aadhaar: '123412341234',
                    shareholding: '100',
                    panFileUri: mockImage,
                    aadhaarFileUri: mockImage
                }]
            })
        });
        console.log('PUT Status:', r3.status);
        const d3 = await r3.json();
        console.log('PUT Result:', d3);
    }
}
run();
