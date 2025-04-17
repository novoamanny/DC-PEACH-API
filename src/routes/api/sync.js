const express = require('express');
const db = require('../../config/db'); // Firestore database connection
const router = express.Router();
const axios = require('axios');  // Assuming you're using axios for HTTP requests

// Shopify Store and Access Token
const SHOPIFY_STORE = "www.dreamcatchers.com";
const SHOPIFY_ACCESS_TOKEN = "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";  // Your token

const axiosConfig = {
    headers: {
        'Content-Type': 'application/json'
    }
}


router.get('/', async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:8000/api/dc/peach/sync`, axiosConfig);
        const members = db.collection('members');

        for (const customer of response.data) {
            const userRef = members.doc(`DC-${customer.customerId}`);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                await userRef.set(customer, { merge: true });
                console.log(`🔄 Updated customer ${customer.customerId}`);
            } else {
                await userRef.set(customer);
                console.log(`🆕 Created customer ${customer.customerId}`);
            }
        }

        res.status(200).send("✅ Members processed successfully.");
    } catch (error) {
        console.error("❌ Error processing Members...", error);
        res.status(500).send("Internal server error.");
    }
});


module.exports = router;