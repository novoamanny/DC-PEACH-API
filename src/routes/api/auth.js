const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../../config/db'); // Firestore connection

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';
const USERS_COLLECTION = 'users';

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

        const snapshot = await db.collection(USERS_COLLECTION).where('email', '==', email).get();
        if (!snapshot.empty) return res.status(400).json({ error: 'Email already registered' });

        const passwordHash = await bcrypt.hash(password, 10);
        const userRef = db.collection(USERS_COLLECTION).doc();
        await userRef.set({ username, email, passwordHash, createdAt: new Date() });

        const token = jwt.sign({ id: userRef.id, email }, JWT_SECRET, { expiresIn: '12h' });
        res.status(201).json({ token, userId: userRef.id });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

        const snapshot = await db.collection(USERS_COLLECTION).where('email', '==', email).get();
        if (snapshot.empty) return res.status(401).json({ error: 'Invalid credentials' });

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: userDoc.id, email }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, userId: userDoc.id });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET USERS (protected route)
router.get('/users', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, JWT_SECRET);

        const snapshot = await db.collection(USERS_COLLECTION).get();
        const users = snapshot.docs.map(doc => {
            const { username, email } = doc.data();
            return { id: doc.id, username, email };
        });
        res.json(users);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
