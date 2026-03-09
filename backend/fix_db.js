const mongoose = require('mongoose');
const config = require('./src/config');
const CR = require('./src/models/CompanyRegistration');
const User = require('./src/models/User');

mongoose.connect(config.mongoUri).then(async () => {
    const user = await User.findOne().sort({ lastLoginAt: -1 });
    if (user) {
        const res = await CR.updateMany({ userId: null }, { $set: { userId: user._id } });
        console.log('Updated CRs with userId:', user._id, 'Count:', res.modifiedCount);
    } else {
        console.log('No users found');
    }
    process.exit(0);
}).catch(console.error);
