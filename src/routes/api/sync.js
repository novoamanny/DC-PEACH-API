const express = require("express");
const db = require("../../config/db");
const axios = require("axios");

const router = express.Router();

const PAGE_SIZE = 250; // Fetch 250 customers per API call
const CHUNK_SIZE = 50; // Firestore batch chunk size to avoid payload limits
const API_URL = "https://dc-api-1m1j.onrender.com/api/dc/membership/all-customers";

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

module.exports = router;
