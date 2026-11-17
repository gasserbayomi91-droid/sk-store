const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'SkStore@2026#';
let ACTIVE_SESSIONS = new Set();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
}
if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'));
}

const DB_FILE = path.join(__dirname, 'database.json');

function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            settings: {
                storeName: 'SK STORE',
                heroBadge: '🚀 المنصة الأولى والأضمن لخدمات السوشيال والشحن',
                heroTitle: 'عزز حضورك وشحن ألعابك المفضلة',
                heroHighlight: 'بكل أمان وسرعة',
                heroSubtitle: 'خدمات حقيقية، تنفيذ تلقائي، ضمان تعويض، ودعم فني متواصل 24/7.',
                paymentNumbers: 'فودافون كاش / أورنج كاش: 01208549411',
                footerText: 'جميع الحقوق محفوظة © 2026 - SK STORE للخدمات الرقمية وشحن الألعاب',
                smmApiUrl: 'https://smmsharks.com/api/v2',
                smmApiKey: ''
            },
            categories: [
                { id: 'social', name: 'تزويد سوشيال ميديا', icon: 'fa-solid fa-users' },
                { id: 'gaming', name: 'شحن الألعاب', icon: 'fa-solid fa-gamepad' }
            ],
            platforms: [
                { id: 1, categoryId: 'social', name: 'تيك توك', icon: '🎵', services: [
                    { id: 101, name: 'متابعين تيك توك حقيقيين', pricePerUnit: 100, pricePerQty: 1000, minQty: 100 },
                    { id: 102, name: 'لايكات تيك توك متفاعلة', pricePerUnit: 30, pricePerQty: 1000, minQty: 200 }
                ]},
                { id: 2, categoryId: 'social', name: 'انستقرام', icon: '📸', services: [
                    { id: 201, name: 'متابعين انستقرام ضمان تعويض', pricePerUnit: 120, pricePerQty: 1000, minQty: 100 }
                ]},
                { id: 7, categoryId: 'gaming', name: 'ببجي موبايل', icon: '🎮', services: [
                    { id: 701, name: 'شحن 60 شدة UC', pricePerUnit: 50, pricePerQty: 1, minQty: 1 },
                    { id: 702, name: 'شحن 325 شدة UC', pricePerUnit: 250, pricePerQty: 1, minQty: 1 }
                ]},
                { id: 8, categoryId: 'gaming', name: 'فري فاير', icon: '🔥', services: [
                    { id: 801, name: 'شحن 100 جوهرة', pricePerUnit: 45, pricePerQty: 1, minQty: 1 }
                ]}
            ],
            orders: [
                { id: 1001, customerName: 'أحمد محمد', platformName: 'تيك توك', serviceName: 'متابعين تيك توك حقيقيين', quantity: 1000, target: '@ahmed_tik', totalPrice: 100, paymentPhone: '01012345678', receiptImage: '', status: 'مكتمل', date: '2026-11-17' }
            ],
            tickets: [
                { id: 501, orderId: 1001, customerName: 'أحمد محمد', messages: [{ sender: 'customer', text: 'شكراً على السرعة!', time: '10:30 PM' }] }
            ]
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
        return initialData;
    }
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!data.settings) data.settings = {};
    if (!data.categories) {
        data.categories = [
            { id: 'social', name: 'تزويد سوشيال ميديا', icon: 'fa-solid fa-users' },
            { id: 'gaming', name: 'شحن الألعاب', icon: 'fa-solid fa-gamepad' }
        ];
    }
    data.platforms.forEach(p => {
        if (!p.categoryId && p.type) p.categoryId = p.type;
    });
    return data;
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function verifyAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.replace('Bearer ', '') : req.body.token;
    if (!token || !ACTIVE_SESSIONS.has(token)) {
        return res.status(403).json({ success: false, message: 'جلسة غير صالحة، يرجى تسجيل الدخول!' });
    }
    next();
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('يسمح برفع الصور فقط (PNG, JPG, WEBP)'));
    }
});

app.get('/api/data', (req, res) => {
    const db = loadDB();
    const safeSettings = { ...db.settings };
    delete safeSettings.smmApiKey;
    res.json({
        settings: safeSettings,
        categories: db.categories,
        platforms: db.platforms,
        orders: db.orders.map(o => ({
            id: o.id, customerName: o.customerName, platformName: o.platformName,
            serviceName: o.serviceName, quantity: o.quantity, status: o.status, date: o.date
        }))
    });
});

app.post('/api/orders', upload.single('receiptImage'), (req, res) => {
    try {
        const db = loadDB();
        const { customerName, platformName, serviceName, quantity, target, totalPrice, paymentPhone } = req.body;
        const receiptImage = req.file ? `/uploads/${req.file.filename}` : '';
        
        const newOrder = {
            id: Math.floor(100000 + Math.random() * 900000),
            customerName: (customerName || 'عميل كريم').trim(),
            platformName, serviceName, quantity: Number(quantity),
            target: (target || '').trim(), totalPrice: Number(totalPrice),
            paymentPhone: (paymentPhone || '').trim(), receiptImage,
            status: 'قيد المراجعة', date: new Date().toISOString().split('T')[0]
        };
        
        db.orders.unshift(newOrder);
        saveDB(db);
        res.json({ success: true, orderId: newOrder.id, message: 'تم إنشاء الطلب بنجاح!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.get('/api/orders/:id', (req, res) => {
    const db = loadDB();
    const orderId = Number(req.params.id);
    const order = db.orders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ success: false, message: 'رقم الطلب غير موجود!' });
    const ticket = db.tickets.find(t => t.orderId === orderId) || { orderId, customerName: order.customerName, messages: [] };
    res.json({ success: true, order, ticket });
});

app.post('/api/tickets', (req, res) => {
    const db = loadDB();
    const { orderId, sender, text } = req.body;
    if (!orderId || !text || !text.trim()) return res.status(400).json({ success: false, message: 'بيانات ناقصة' });
    let ticket = db.tickets.find(t => t.orderId === Number(orderId));
    if (!ticket) {
        const order = db.orders.find(o => o.id === Number(orderId));
        if (!order) return res.status(404).json({ success: false, message: 'رقم الطلب غير صحيح' });
        ticket = { id: Date.now(), orderId: Number(orderId), customerName: order.customerName, messages: [] };
        db.tickets.push(ticket);
    }
    ticket.messages.push({
        sender: sender === 'admin' ? 'admin' : 'customer',
        text: text.trim(),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    });
    saveDB(db);
    res.json({ success: true, ticket });
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = crypto.randomBytes(32).toString('hex');
        ACTIVE_SESSIONS.add(token);
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة!' });
    }
});

app.post('/api/admin/logout', verifyAdmin, (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.replace('Bearer ', '') : req.body.token;
    ACTIVE_SESSIONS.delete(token);
    res.json({ success: true });
});

app.get('/api/admin/full-data', verifyAdmin, (req, res) => {
    res.json({ success: true, db: loadDB() });
});

app.post('/api/admin/update-db', verifyAdmin, (req, res) => {
    if (!req.body.db) return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
    saveDB(req.body.db);
    res.json({ success: true, message: 'تم حفظ كافة التعديلات بنجاح!' });
});

app.post('/api/admin/fetch-smm-services', verifyAdmin, async (req, res) => {
    const { apiUrl, apiKey } = req.body;
    if (!apiUrl || !apiKey) return res.status(400).json({ success: false, message: 'يرجى إدخال رابط الـ API ومفتاح API Key!' });
    try {
        const params = new URLSearchParams();
        params.append('key', apiKey.trim());
        params.append('action', 'services');

        const response = await fetch(apiUrl.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const data = await response.json();
        if (Array.isArray(data)) res.json({ success: true, services: data });
        else if (data.error) res.status(400).json({ success: false, message: 'خطأ من المزود: ' + data.error });
        else res.status(400).json({ success: false, message: 'استجابة غير متوقعة من المزود' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'فشل الاتصال بالمزود: ' + error.message });
    }
});

app.listen(PORT, () => console.log(`SK Store running on port ${PORT}`));
