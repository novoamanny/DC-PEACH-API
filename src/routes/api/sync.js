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
        const customers = response.data;

        // Split into chunks of 500 for Firestore limits
        const chunkSize = 500;
        for (let i = 0; i < customers.length; i += chunkSize) {
            const batch = db.batch();
            const chunk = customers.slice(i, i + chunkSize);

            for (const customer of chunk) {
                const userRef = members.doc(`DC-${customer.customerId}`);
                const userDoc = await userRef.get();

                if (userDoc.exists) {
                    batch.set(userRef, customer, { merge: true });
                    console.log(`🔄 Batched update for customer ${customer.customerId}`);
                } else {
                    batch.set(userRef, customer);
                    console.log(`🆕 Batched create for customer ${customer.customerId}`);
                }
            }

            await batch.commit();
            console.log(`✅ Batch ${i / chunkSize + 1} committed.`);
        }

        res.status(200).send("✅ Members processed successfully.");
    } catch (error) {
        console.error("❌ Error processing Members...", error);
        res.status(500).send("Internal server error.");
    }
});



module.exports = router;