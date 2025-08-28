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


// --- Update stamps for members and also update loyalty in customers ---
router.post("/update-stamps-for-members", async (req, res) => {
  try {
    const { updates } = req.body; // [{ customerId, newStamps }]
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Array of updates required" });
    }

    let updatedCount = 0;

    for (const update of updates) {
      const { customerId, newStamps } = update;
      if (!customerId) continue;

      // --- Update members collection ---
      const memberRef = db.collection("members").doc(customerId);
      await memberRef.set({
        loyalty: { stamps: newStamps },
        updatedAt: new Date()
      }, { merge: true });

      console.log(`✅ Updated member ${customerId}:`, { stamps: newStamps });

      // --- Also update customers collection using loyalty logic ---
      const customerRef = db.collection("customers").doc(customerId); // exact docId, no extra DC-
      const customerDoc = await customerRef.get();

      if (customerDoc.exists) {
        const customerData = customerDoc.data();
        customerData.loyalty = customerData.loyalty || { points: 0, stamps: 0, count: 0 };

        // Recalculate loyalty based on newStamps
        const currentCount = customerData.loyalty.count || 0;
        const totalCount = currentCount + newStamps;
        const calculatedStamps = Math.floor(totalCount / 5);
        const remainder = totalCount % 5;

        customerData.loyalty.stamps += calculatedStamps;
        customerData.loyalty.count = remainder;
        customerData.updatedAt = new Date();

        await customerRef.set(customerData, { merge: true });
        console.log(`✅ Updated customer loyalty ${customerId}:`, customerData.loyalty);
      } else {
        console.warn(`⚠️ Customer ${customerId} not found in customers collection`);
      }

      updatedCount++;
      await new Promise(r => setTimeout(r, 50)); // throttle Firestore writes
    }

    res.status(200).json({ message: `✅ Updated stamps for ${updatedCount} members and customers.` });
  } catch (error) {
    console.error("❌ Error updating stamps:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});





module.exports = router;
