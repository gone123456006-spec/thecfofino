const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    purpose: { type: String, default: 'General enquiry' },
    details: String,
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending',
    },
    adminNotes: String,
    scheduledAt: Date,
}, {
    timestamps: true,
});

module.exports = mongoose.model('Booking', BookingSchema);
