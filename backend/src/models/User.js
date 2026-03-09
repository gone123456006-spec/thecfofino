const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    mobile: { type: String, default: null },
    email: { type: String, default: null },
    firebaseUid: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
}, {
    timestamps: true,
});

UserSchema.index({ mobile: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ firebaseUid: 1 }, { unique: true, sparse: true });

// Omit email when null so sparse unique index allows multiple users without email
UserSchema.pre('save', function (next) {
    if (this.email === null || this.email === '') {
        this.email = undefined;
    }
    if (this.firebaseUid === null || this.firebaseUid === '') {
        this.firebaseUid = undefined;
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);
