const express = require("express");
const db = require("../../config/db");
const axios = require("axios");

const router = express.Router();

const PAGE_SIZE = 250; // Fetch 250 customers per API call
const CHUNK_SIZE = 50; // Firestore batch chunk size to avoid payload limits
const API_URL = "https://dc-api-1m1j.onrender.com/api/dc/membership/all-customers";
const MAIN_API_URL = "https://dc-api-1m1j.onrender.com/api/dc/membership/loyalty/update-stamps";


// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry Firestore batch commit
async function commitWithRetry(batch, attempt = 1) {
  try {
    await batch.commit();
  } catch (err) {
    if (err.code === 4 && attempt <= 5) { // RESOURCE_EXHAUSTED
      const waitTime = attempt * 2000;
      console.warn(`⏳ Firestore quota hit, retrying in ${waitTime}ms (attempt ${attempt})`);
      await sleep(waitTime);
      return commitWithRetry(batch, attempt + 1);
    }
    throw err;
  }
}

// Retry axios fetch
async function fetchWithRetry(params, attempt = 1) {
  try {
    return await axios.get(API_URL, { params });
  } catch (err) {
    if (attempt <= 5) {
      const wait = attempt * 2000;
      console.warn(`⚠️ Axios failed, retrying in ${wait}ms (attempt ${attempt})`);
      await sleep(wait);
      return fetchWithRetry(params, attempt + 1);
    }
    throw err;
  }
}

// Main sync route
router.get("/", async (req, res) => {
  try {
    const members = db.collection("members");
    let lastId = null;
    let page = 1;
    let totalProcessed = 0;

    while (true) {
      // Fetch a page from /all-customers
      const { data: customers } = await fetchWithRetry({
        limit: PAGE_SIZE,
        last: lastId
      });

      if (!customers.length) break;

      // Split into smaller chunks to avoid Firestore payload limit
      for (let i = 0; i < customers.length; i += CHUNK_SIZE) {
        const chunk = customers.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();

        for (const customer of chunk) {
          const ref = members.doc(`DC-${customer.customerId}`);
          batch.set(ref, {
            customerId: customer.customerId,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            totalSpent: customer.totalSpent,
            ordersCount: customer.ordersCount,
            acceptsMarketing: customer.acceptsMarketing,
            tags: customer.tags || [],
            defaultAddress: customer.defaultAddress || {},
            addresses: customer.addresses || [],
            lastOrder: customer.lastOrder || {},
            loyalty: customer.loyalty || {}
          }, { merge: true });
        }

        await commitWithRetry(batch);
        totalProcessed += chunk.length;
      }

      console.log(`📦 Page ${page} committed with ${customers.length} docs. Total so far: ${totalProcessed}`);

      lastId = customers[customers.length - 1].id;
      page++;
      await sleep(1500); // small backoff
    }

    res.status(200).send(`✅ Sync finished. Total customers synced: ${totalProcessed}`);
  } catch (error) {
    console.error("❌ Error during sync:", error);
    res.status(500).send("Internal server error.");
  }
});



// Route to update stamps locally and on main API
router.post("/update-stamps-for-members", async (req, res) => {
  try {
    const { updates } = req.body; // Expect an array: [{ customerId, additionalStamps }]
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Array of updates required" });
    }

    let updatedCount = 0;

    for (const update of updates) {
      const { customerId, additionalStamps } = update;
      if (!customerId || typeof additionalStamps !== "number") continue;

      // --- 1️⃣ Update initiative API member document ---
      const memberRef = db.collection("members").doc(`DC-${customerId}`);
      const memberDoc = await memberRef.get();
      if (!memberDoc.exists) continue;

      const memberData = memberDoc.data();
      memberData.loyalty = memberData.loyalty || { stamps: 0, count: 0 };

      const newTotalCount = (memberData.loyalty.count || 0) + additionalStamps;
      const newStamps = Math.floor(newTotalCount / 5);
      const newRemainder = newTotalCount % 5;

      memberData.loyalty.stamps += newStamps;
      memberData.loyalty.count = newRemainder;
      memberData.updatedAt = new Date();

      await memberRef.set(memberData, { merge: true });

      // --- 2️⃣ Call main API to update same customer ---
      try {
        await axios.post(MAIN_API_URL, {
          customerId,
          additionalStamps
        });
      } catch (err) {
        console.error(`❌ Failed to update main API for ${customerId}:`, err.message);
      }

      updatedCount++;
      await sleep(100); // throttle requests
    }

    res.status(200).json({ message: `✅ Updated stamps for ${updatedCount} members.` });
  } catch (error) {
    console.error("❌ Error updating stamps for members:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});


module.exports = router;
