const mongoose = require('mongoose');
const User = require('../src/models/User');
const config = require('../src/config');

async function removeTestUser() {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB');

        const testPhones = ['9999999999'];
        const testNames = ['Test', 'Test user', 'Test User'];

        const result = await User.deleteMany({
            $or: [
                { mobile: { $in: testPhones } },
                { name: { $in: testNames } }
            ]
        });

        console.log(`Successfully deleted ${result.deletedCount} test user(s).`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

removeTestUser();
