const fetch = require('node-fetch');
const fs = require('fs');

const API_KEY = '008919902f2b55af442833ceef6ffeef';
const TEMPLATE_ID = 'd6cb8744-8bc1-46e8-a91c-d68c8370bcdc';
const SENDER_ID = 'f92fa8dc-cb3e-44c4-b3fd-538c7046558d';
const PHONE = '919595959595';

async function testOtp() {
    try {
        const sendRes = await fetch('https://api.otp.dev/v1/verifications', {
            method: "POST",
            headers: {
                'X-OTP-Key': API_KEY,
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    channel: "sms",
                    sender: SENDER_ID,
                    phone: PHONE,
                    template: TEMPLATE_ID,
                    code_length: 4
                }
            })
        });

        const sendJson = await sendRes.json();
        fs.writeFileSync('otp_response.json', JSON.stringify(sendJson, null, 2));

        if (sendJson.data && sendJson.data.id) {
            const verifyId = sendJson.data.id;
            const verifyRes = await fetch(`https://api.otp.dev/v1/verifications/${verifyId}/check`, {
                method: "POST",
                headers: {
                    'X-OTP-Key': API_KEY,
                    'accept': 'application/json',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({ data: { code: "1234" } })
            });
            const verifyJson = await verifyRes.json();
            fs.writeFileSync('otp_verify_response.json', JSON.stringify(verifyJson, null, 2));

            const verifyResGet = await fetch(`https://api.otp.dev/v1/verifications/${verifyId}`, {
                method: "GET",
                headers: {
                    'X-OTP-Key': API_KEY,
                    'accept': 'application/json',
                    'content-type': 'application/json'
                }
            });
            const verifyJsonGet = await verifyResGet.json();
            fs.writeFileSync('otp_verify_get_response.json', JSON.stringify(verifyJsonGet, null, 2));
        }
    } catch (err) {
        console.error(err);
    }
}

testOtp();
