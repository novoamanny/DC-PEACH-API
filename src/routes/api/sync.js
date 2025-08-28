const express = require("express");
const db = require("../../config/db");
const axios = require("axios");

const router = express.Router();

const PAGE_SIZE = 250;
const CHUNK_SIZE = 50;
const API_URL = "https://dc-api-1m1j.onrender.com/api/dc/membership/all-customers";
const MAIN_API_URL = "https://dc-api-1m1j.onrender.com/api/dc/membership/loyalty/update-stamps";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function commitWithRetry(batch, attempt = 1) {
  try {
    await batch.commit();
  } catch (err) {
    if (err.code === 4 && attempt <= 5) { // RESOURCE_EXHAUSTED
      await sleep(attempt * 2000);
      return commitWithRetry(batch, attempt + 1);
    }
    throw err;
  }
}

async function fetchWithRetry(params, attempt = 1) {
  try {
    return await axios.get(API_URL, { params });
  } catch (err) {
    if (attempt <= 5) {
      await sleep(attempt * 2000);
      return fetchWithRetry(params, attempt + 1);
    }
    throw err;
  }
}

// --- Main sync route (unchanged) ---
router.get("/", async (req, res) => {
  try {
    const members = db.collection("members");
    let lastId = null;
    let page = 1;
    let totalProcessed = 0;

    while (true) {
      const { data: customers } = await fetchWithRetry({ limit: PAGE_SIZE, last: lastId });
      if (!customers.length) break;

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
      await sleep(1500);
    }

    res.status(200).send(`✅ Sync finished. Total customers synced: ${totalProcessed}`);
  } catch (error) {
    console.error("❌ Error during sync:", error);
    res.status(500).send("Internal server error.");
  }
});

// --- Update stamps locally ONLY ---
router.post("/update-stamps-for-members", async (req, res) => {
  try {
    const { updates } = req.body; // [{ customerId, additionalStamps }]
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Array of updates required" });
    }

    let updatedCount = 0;

    for (const update of updates) {
      const { customerId, additionalStamps } = update;
      if (!customerId || typeof additionalStamps !== "number") continue;

      const memberRef = db.collection("members").doc(`DC-${customerId}`);
      const memberDoc = await memberRef.get();
      if (!memberDoc.exists) continue;

      const memberData = memberDoc.data();
      memberData.loyalty = memberData.loyalty || { stamps: 0, count: 0 };

      const totalCount = (memberData.loyalty.count || 0) + additionalStamps;
      const newStamps = Math.floor(totalCount / 5);
      const newRemainder = totalCount % 5;

      memberData.loyalty.stamps += newStamps;
      memberData.loyalty.count = newRemainder;
      memberData.updatedAt = new Date();

      await memberRef.set(memberData, { merge: true });

      updatedCount++;
      await sleep(50); // small throttle
    }

    res.status(200).json({ message: `✅ Updated stamps for ${updatedCount} members.` });
  } catch (error) {
    console.error("❌ Error updating stamps:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
