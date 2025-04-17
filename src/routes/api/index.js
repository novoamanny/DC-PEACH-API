const express = require('express');
const db = require('../../config/db'); // Firestore database connection
const router = express.Router();
const axios = require('axios');  // Assuming you're using axios for HTTP requests

// Shopify Store and Access Token
const SHOPIFY_STORE = "www.dreamcatchers.com";
const SHOPIFY_ACCESS_TOKEN = "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";  // Your token

router.get('/', async (req, res) => {
    try {
        const customersRef = db.collection('members');
        const snapshot = await customersRef.get();

        const loyaltyCustomers = [];

        snapshot.forEach(doc => {
            const data = doc.data();

            loyaltyCustomers.push({
                id: doc.id,
                ...data
            });
        });

        loyaltyCustomers.sort((a, b) => b.loyalty.stamps - a.loyalty.stamps);

        res.status(200).json(loyaltyCustomers); // Send only loyalty customers
    } catch (error) {
        console.error('Error fetching loyalty customers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;