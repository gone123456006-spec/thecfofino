/**
 * Tracker steps — aligned with the mobile app filing tracker.
 */
const TRACKER_STEPS = [
    {
        key: 'document_submitted',
        label: 'Documents Submitted',
        sublabel: 'We have received your documents',
    },
    {
        key: 'submitted',
        label: 'Application Submitted',
        sublabel: 'Application submitted to the authority',
    },
    {
        key: 'initiated',
        label: 'Process Initiated',
        sublabel: 'Filing process has begun',
    },
    {
        key: 'filed',
        label: 'Filed with MCA',
        sublabel: 'Name filed with Ministry of Corporate Affairs',
    },
    {
        key: 'approved',
        label: 'Approved',
        sublabel: 'Application approved — incorporation complete',
    },
];

const STATUS_MAP = {
    draft: [],
    payment_pending: [],
    paid: ['document_submitted'],
    upload_in_progress: ['document_submitted'],
    pending: [],
    submitted: ['document_submitted', 'submitted'],
    initiated: ['document_submitted', 'submitted', 'initiated'],
    filed: ['document_submitted', 'submitted', 'initiated', 'filed'],
    approved: ['document_submitted', 'submitted', 'initiated', 'filed', 'approved'],
    completed: ['document_submitted', 'submitted', 'initiated', 'filed', 'approved'],
    rejected: ['document_submitted'],
};

function effectiveRegistrationStatus(reg) {
    const st = String(reg?.status || 'pending').toLowerCase();
    if (st === 'pending' && reg?.paymentStatus === 'paid') return 'paid';
    return st;
}

function resolveStepsDone(status) {
    const key = String(status || '').toLowerCase();
    const done = STATUS_MAP[key] || [];
    return {
        document_submitted: done.includes('document_submitted'),
        submitted: done.includes('submitted'),
        initiated: done.includes('initiated'),
        filed: done.includes('filed'),
        approved: done.includes('approved'),
    };
}

function getNextPendingStepLabel(stepsDone) {
    for (const step of TRACKER_STEPS) {
        if (!stepsDone[step.key]) return step.label;
    }
    return 'Review in progress';
}

module.exports = {
    TRACKER_STEPS,
    effectiveRegistrationStatus,
    resolveStepsDone,
    getNextPendingStepLabel,
};
