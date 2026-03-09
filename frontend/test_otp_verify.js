const fetch = require('node-fetch');
const fs = require('fs');

const API_KEY = '008919902f2b55af442833ceef6ffeef';

async function testOtpAll() {
    let log = '';
    try {
        // Search for 1234 which definitely doesn't exist
        const rAll = await fetch(`https://api.otp.dev/v1/verifications?code=123456`, {
            method: "GET", headers: { 'X-OTP-Key': API_KEY, 'accept': 'application/json' }
        });
        log += "GET All: " + JSON.stringify(await rAll.json().catch(e => e.message)) + "\n";
    } catch (err) {
        log += "Error: " + err.message + "\n";
    }
    fs.writeFileSync('test_out.txt', log);
}
testOtpAll();
