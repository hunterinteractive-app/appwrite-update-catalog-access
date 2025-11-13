import { Client, Databases, Query } from "appwrite";

export default async ({ req, res, log, error }) => {
  log("📥 Function Triggered");

  // -----------------------------
  // 1. RAW BODY
  // -----------------------------
  const raw = req.bodyRaw || "";
  log(`📦 Raw Payload: ${raw}`);

  let body = {};
  try {
    body = JSON.parse(raw);
  } catch (err) {
    error("❌ Failed to parse JSON: " + err);
    return res.send("Invalid JSON", 400);
  }

  const eventType =
    body?.type || body?.event_type || body?.data?.type || "";
  log(`🔎 Event Type: ${eventType}`);

  if (eventType !== "payment.created") {
    log("⚠️ Ignored non-payment event");
    return res.send("Ignored", 200);
  }

  // -----------------------------
  // 2. Extract Buyer Email
  // -----------------------------
  const email =
    body?.data?.object?.payment?.buyer_email_address ||
    body?.data?.object?.order?.buyer_email_address ||
    null;

  if (!email) {
    error("❌ No buyer email found");
    return res.send("Missing email", 400);
  }

  log(`📧 Buyer Email: ${email}`);

  // -----------------------------
  // 3. Init Appwrite Client
  // -----------------------------
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT) // https://sfo.cloud.appwrite.io/v1
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);

  const DATABASE_ID = process.env.USER_DATABASE_ID;      // "691538490013ed9a0643"
  const COLLECTION_ID = process.env.USER_COLLECTION_ID;  // "users"

  log(`🗄 DB: ${DATABASE_ID}, Collection: ${COLLECTION_ID}`);

  // -----------------------------
  // 4. Lookup user by email
  // -----------------------------
  let lookup;
  try {
    lookup = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("email", email),
    ]);
  } catch (err) {
    error("❌ DB Lookup Error: " + err.message);
    return res.send("Query failed", 500);
  }

  log(`🔍 Lookup Result Count: ${lookup.total}`);

  if (lookup.total === 0) {
    log("⚠️ No matching user found");
    return res.send("User not found", 200);
  }

  const user = lookup.documents[0];
  log(`➡️ Updating user: ${user.$id}`);

  // -----------------------------
  // 5. Update user access
  // -----------------------------
  try {
    const updated = await db.updateDocument(
      DATABASE_ID,
      COLLECTION_ID,
      user.$id,
      {
        canViewCatalog: true,
        catalogYear: 2024,
        accessGrantedAt: new Date().toISOString(),
      }
    );

    log("✅ User Updated: " + JSON.stringify(updated));
    return res.send("Catalog access granted", 200);
  } catch (err) {
    error("❌ Failed to update user: " + err.message);
    return res.send("Update failed", 500);
  }
};
