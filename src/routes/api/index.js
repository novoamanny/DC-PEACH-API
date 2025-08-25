const express = require('express');
const db = require('../../config/db'); // Firestore database connection
const router = express.Router();

// In-memory cache
let cachedLoyaltyCustomers = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const PAGE_SIZE = 500; // Firestore batch size

router.get("/", async (req, res) => {
    try {
        const now = Date.now();

        // Return cached data if valid
        if (cachedLoyaltyCustomers && now - cacheTimestamp < CACHE_TTL) {
            console.log("⚡ Returning loyalty customers from in-memory cache");
            return res.status(200).json(cachedLoyaltyCustomers);
        }

        // Fetch fresh data from Firestore in pages
        const loyaltyCustomers = [];
        let lastDoc = null;

        while (true) {
            let query = db.collection("members")
                          .where("loyalty.stamps", ">", 0)
                          .orderBy("loyalty.stamps", "desc")
                          .limit(PAGE_SIZE);

            if (lastDoc) query = query.startAfter(lastDoc);

            const snapshot = await query.get();
            if (snapshot.empty) break;

            snapshot.forEach(doc => {
                const data = doc.data();
                loyaltyCustomers.push({
                    id: doc.id,
                    ...data
                });
            });

            lastDoc = snapshot.docs[snapshot.docs.length - 1];

            if (snapshot.size < PAGE_SIZE) break; // last page
        }

        // Update in-memory cache
        cachedLoyaltyCustomers = loyaltyCustomers;
        cacheTimestamp = now;

        console.log(`⚡ Fetched ${loyaltyCustomers.length} loyalty customers from Firestore and cached`);
        res.status(200).json(loyaltyCustomers);

    } catch (error) {
        console.error("❌ Error fetching loyalty customers:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
