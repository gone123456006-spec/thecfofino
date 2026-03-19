const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const CompanyRegistration = require('./src/models/CompanyRegistration');

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not found in .env');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const latest = await CompanyRegistration.findOne().sort({ createdAt: -1 });
    if (latest) {
      latest.paymentAmount = 1;
      await latest.save();
      console.log(`Successfully updated registration ${latest._id} to ₹1`);
      console.log(`Company Name: ${latest.proposedName1 || 'N/A'}`);
    } else {
      console.log('No registrations found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
