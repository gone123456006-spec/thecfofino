const fetch = require('node-fetch'); // if Node < 18, but Node 22 has fetch. Wait, I'll just use global fetch.

async function run() {
    const r1 = await fetch('http://localhost:4000/api/otp/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', mobile: '9999999999' })
    });
    const d1 = await r1.json();
    console.log('Token:', d1.token);

    const r2 = await fetch('http://localhost:4000/api/registrations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + d1.token
        },
        body: JSON.stringify({
            businessType: 'PVT',
            proposedName1: 'Testing1',
            businessActivity: 'Test',
            registeredAddress: 'Test',
            capitalStructure: '1',
            companyMobile: '1',
            companyEmail: '1@1.com',
            directors: []
        })
    });
    const d2 = await r2.json();
    console.log('Reg Result:', d2);
}
run();
