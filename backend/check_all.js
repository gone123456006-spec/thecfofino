const mongoose = require('mongoose');
const CompanyRegistration = require('./src/models/CompanyRegistration');
const config = require('./src/config');

async function checkAll() {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB');

        const regs = await CompanyRegistration.find().sort({ createdAt: -1 }).limit(10).lean();
        if (regs.length === 0) {
            console.log('No registrations found');
            return;
        }

        console.log(`Found ${regs.length} recent registrations:`);
        regs.forEach((r, i) => {
            console.log(`\n--- [${i}] ${r.caseId || 'NO CASE ID'} (${r._id}) ---`);
            console.log(`Company: ${r.proposedName1}`);
            console.log(`Status: ${r.status}, Payment: ${r.paymentStatus}`);
            console.log(`Email: ${r.companyEmail}, Mobile: ${r.companyMobile}`);
            console.log(`Directors Count: ${r.directors?.length || 0}`);
            if (r.directors && r.directors.length > 0) {
                r.directors.forEach((d, j) => {
                    console.log(`  Director ${j + 1}: ${d.name}`);
                    console.log(`    PAN Length: ${d.panFileUri ? d.panFileUri.length : 0}`);
                    console.log(`    Aadhaar Length: ${d.aadhaarFileUri ? d.aadhaarFileUri.length : 0}`);
                });
            }
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkAll();
