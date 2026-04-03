const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const CompanyRegistration = require('../models/CompanyRegistration');
const auth = require('../middleware/auth');
const userAuth = require('../middleware/userAuth');
const config = require('../config');

// POST /api/registrations — accept submission from mobile app (public); optional Authorization links to user
router.post('/', async (req, res) => {
    try {
        const data = { ...req.body };
        if (!data.businessType || !data.proposedName1) {
            return res.status(400).json({ ok: false, error: 'businessType and proposedName1 are required' });
        }
        const header = req.headers['authorization'] || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        console.log('Registration received: Has header:', !!header, 'Has token:', !!token);
        if (token) {
            try {
                const decoded = jwt.verify(token, config.jwt.secret);
                console.log('Registration decoded token:', decoded);
                if (decoded.userId) data.userId = decoded.userId;
            } catch (err) {
                console.log('Registration token verify failed:', err.message);
            }
        }
        const registration = new CompanyRegistration(data);
        if (data.directors && Array.isArray(data.directors)) {
            data.directors.forEach((d, i) => {
                console.log(`POST Director ${i}: name="${d.name}", PAN len=${d.panFileUri?.length || 0}, AadhaarFront len=${d.aadhaarFrontFileUri?.length || 0}, AadhaarBack len=${d.aadhaarBackFileUri?.length || 0}`);
            });
        }
        await registration.save();
        res.status(201).json({ ok: true, id: registration._id, caseId: registration.caseId });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// PUT /api/registrations/:id — update an existing registration (used for multi-step form)
router.put('/:id', async (req, res) => {
    try {
        const registration = await CompanyRegistration.findById(req.params.id);
        if (!registration) {
            return res.status(404).json({ ok: false, error: 'Registration not found' });
        }

        // Update fields
        const data = { ...req.body };
        delete data._id;
        delete data.caseId;

        console.log('UPDATE Registration body keys:', Object.keys(data));
        if (data.directors && Array.isArray(data.directors)) {
            data.directors.forEach((d, i) => {
                console.log(`UPDATE Director ${i}: name="${d.name}", PAN len=${d.panFileUri?.length || 0}, AadhaarFront len=${d.aadhaarFrontFileUri?.length || 0}, AadhaarBack len=${d.aadhaarBackFileUri?.length || 0}`);
            });
            // Explictly set the directors array to trigger change detection in Mongoose
            registration.directors = data.directors;
            delete data.directors;
        }

        Object.assign(registration, data);
        await registration.save();

        res.status(200).json({ ok: true, id: registration._id, caseId: registration.caseId });
    } catch (err) {
        console.error('Update registration error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/registrations/my — current user's registrations (app user token required); returns latest for status sync
// ?summary=1 — omit director blobs (lighter payload for payment history / lists); optional &limit= (default 10 full, 50 summary)
router.get('/my', userAuth, async (req, res) => {
    try {
        const summary = req.query.summary === '1';
        const cap = summary ? 50 : 10;
        const limit = Math.min(Math.max(Number(req.query.limit) || cap, 1), 100);
        let q = CompanyRegistration.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .allowDiskUse(true)
            .limit(limit)
            .lean();
        if (summary) {
            q = q.select(
                'status paymentStatus paymentAmount caseId proposedName1 createdAt businessType paidAt paymentReference paymentMethod updatedAt',
            );
        } else {
            q = q.select(
                'status paymentStatus paymentAmount caseId proposedName1 createdAt businessType directors paidAt paymentReference paymentMethod updatedAt',
            );
        }
        const list = await q;
        res.json({ ok: true, registrations: list });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/registrations — list all (admin only)
router.get('/', auth, async (req, res) => {
    try {
        const { status, paymentStatus, search, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        if (search) {
            filter.$or = [
                { caseId: { $regex: search, $options: 'i' } },
                { proposedName1: { $regex: search, $options: 'i' } },
                { companyEmail: { $regex: search, $options: 'i' } },
                { companyMobile: { $regex: search, $options: 'i' } },
                { businessType: { $regex: search, $options: 'i' } },
            ];
        }

        const total = await CompanyRegistration.countDocuments(filter);
        const registrations = await CompanyRegistration.find(filter)
            .sort({ createdAt: -1 })
            .allowDiskUse(true)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .select('-directors.panFileUri -directors.aadhaarFrontFileUri -directors.aadhaarBackFileUri'); // exclude large base64 blobs from list view

        res.json({ ok: true, total, registrations });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/registrations/stats — summary stats (admin only)
router.get('/stats', auth, async (req, res) => {
    try {
        const [total, pending, inProgress, completed, paid, unpaid] = await Promise.all([
            CompanyRegistration.countDocuments(),
            CompanyRegistration.countDocuments({ status: 'pending' }),
            CompanyRegistration.countDocuments({ status: 'in_progress' }),
            CompanyRegistration.countDocuments({ status: 'completed' }),
            CompanyRegistration.countDocuments({ paymentStatus: 'paid' }),
            CompanyRegistration.countDocuments({ paymentStatus: 'unpaid' }),
        ]);

        const revenueAgg = await CompanyRegistration.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$paymentAmount' } } },
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        res.json({ ok: true, stats: { total, pending, inProgress, completed, paid, unpaid, totalRevenue } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/registrations/:id/directors/:dirIndex/:docType — serve PAN or Aadhaar image (admin only)
router.get('/:id/directors/:dirIndex/:docType', auth, async (req, res) => {
    try {
        const { id, dirIndex, docType } = req.params;
        if (!['pan', 'aadhaar-front', 'aadhaar-back'].includes(docType)) return res.status(400).json({ ok: false, error: 'Invalid docType' });
        const reg = await CompanyRegistration.findById(id).lean();
        if (!reg || !reg.directors) return res.status(404).json({ ok: false, error: 'Not found' });
        const idx = parseInt(dirIndex, 10);
        let field = '';
        if (docType === 'pan') field = 'panFileUri';
        else if (docType === 'aadhaar-front') field = 'aadhaarFrontFileUri';
        else if (docType === 'aadhaar-back') field = 'aadhaarBackFileUri';

        if (!field || isNaN(idx) || idx < 0 || idx >= reg.directors.length) {
            return res.status(404).json({ ok: false, error: 'Document not found or invalid index/type' });
        }
        const dataUrl = (reg.directors[idx][field] || '').trim();
        if (!dataUrl || !dataUrl.startsWith('data:')) {
            return res.status(404).json({ ok: false, error: 'Document not available' });
        }
        const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
        if (!match) return res.status(400).json({ ok: false, error: 'Invalid data URL' });
        const contentType = match[1];
        const base64 = match[2];
        const buf = Buffer.from(base64, 'base64');
        const ext = contentType.indexOf('pdf') !== -1 ? 'pdf' : 'jpg';
        const filename = `director-${idx + 1}-${docType}.${ext}`;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(buf);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/registrations/:id — single registration (admin only)
router.get('/:id', auth, async (req, res) => {
    try {
        const reg = await CompanyRegistration.findById(req.params.id);
        if (!reg) return res.status(404).json({ ok: false, error: 'Not found' });
        res.json({ ok: true, registration: reg });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// PATCH /api/registrations/:id/status — update application status (admin only)
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status, adminNotes, assignedTo } = req.body;
        const update = {};
        if (status) update.status = status;
        if (adminNotes !== undefined) update.adminNotes = adminNotes;
        if (assignedTo !== undefined) update.assignedTo = assignedTo;

        const reg = await CompanyRegistration.findByIdAndUpdate(
            req.params.id,
            { $set: update },
            { new: true }
        );
        if (!reg) return res.status(404).json({ ok: false, error: 'Not found' });
        res.json({ ok: true, registration: reg });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// PATCH /api/registrations/:id/payment — mark payment (admin only)
router.patch('/:id/payment', auth, async (req, res) => {
    try {
        const { paymentStatus, paymentAmount, paymentReference, paymentMethod } = req.body;
        const update = {};
        if (paymentStatus) update.paymentStatus = paymentStatus;
        if (paymentAmount !== undefined) update.paymentAmount = paymentAmount;
        if (paymentReference !== undefined) update.paymentReference = paymentReference;
        if (paymentMethod !== undefined) update.paymentMethod = paymentMethod;
        if (paymentStatus === 'paid') update.paidAt = new Date();

        const reg = await CompanyRegistration.findByIdAndUpdate(
            req.params.id,
            { $set: update },
            { new: true }
        );
        if (!reg) return res.status(404).json({ ok: false, error: 'Not found' });
        res.json({ ok: true, registration: reg });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
