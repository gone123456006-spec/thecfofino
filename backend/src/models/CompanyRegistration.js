const mongoose = require('mongoose');

const DirectorSchema = new mongoose.Schema({
    name: String,
    pan: String,
    aadhaar: String,
    shareholding: String,
    panFileUri: String,
    aadhaarFrontFileUri: String,
    aadhaarBackFileUri: String,
});

const CompanyRegistrationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    caseId: { type: String, trim: true, index: true },
    businessType: { type: String, required: true },
    proposedName1: { type: String, required: true },
    proposedName2: String,
    proposedName3: String,
    businessActivity: String,
    registeredAddress: String,
    capitalStructure: String,
    companyMobile: String,
    companyEmail: String,
    directors: [DirectorSchema],

    // Admin-managed fields
    status: {
        type: String,
        enum: ['pending', 'Submitted', 'Initiated', 'Filed', 'Approved', 'rejected'],
        default: 'pending',
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid'],
        default: 'unpaid',
    },
    paymentAmount: { type: Number, default: 0 },
    paymentReference: String,
    paymentMethod: String,
    paidAt: Date,
    adminNotes: String,
    assignedTo: String,
    /** Keys: payment_received, document_submitted, …, pending_payment, pending_process → Date sent */
    emailsSent: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
    // Index on createdAt so sort({ createdAt: -1 }) uses the index instead of in-memory sort
    // This prevents the 32 MB sort memory limit error when documents are large (e.g. base64 images)
});

CompanyRegistrationSchema.index({ createdAt: -1 });

CompanyRegistrationSchema.pre('save', async function (next) {
    if (this.isNew && (!this.caseId || this.caseId === 'FINO112' || this.caseId.trim() === '')) {
        try {
            const lastReg = await this.constructor.findOne({ caseId: /^FINO-R-\d+$/ })
                .sort({ createdAt: -1 })
                .allowDiskUse(true);

            let nextNum = 1001;
            if (lastReg && lastReg.caseId) {
                const match = lastReg.caseId.match(/^FINO-R-(\d+)$/);
                if (match && match[1]) {
                    nextNum = parseInt(match[1], 10) + 1;
                }
            }
            this.caseId = `FINO-R-${nextNum}`;
        } catch (err) {
            console.error('Error generating case ID:', err);
        }
    }
    next();
});

module.exports = mongoose.model('CompanyRegistration', CompanyRegistrationSchema);
