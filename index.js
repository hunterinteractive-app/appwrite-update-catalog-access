import { Client, Databases, Query } from "appwrite";

export default async function (req, res) {
  res.setHeader("Content-Type", "application/json");

  // ---------------------------------------------------------
  // 0. LOG RAW BODY
  // ---------------------------------------------------------
  console.log("📥 Function Triggered");

  let raw = req.bodyRaw || "";
  console.log("📦 Raw Payload:", raw);

  // Handle empty body
  if (!raw || raw.trim() === "") {
    console.log("❌ Empty body received");
    return res.send("Ignored: Empty body");
  }

  // ---------------------------------------------------------
  // 1. SAFE JSON PARSE
  // ---------------------------------------------------------
  let event;
  try {
    event = JSON.parse(raw);
  } catch (err) {
    console.log("❌ Failed to parse JSON:", err.message);
    return res.send("JSON parse error");
  }

  console.log("🔎 Parsed Event:", event);

  // ---------------------------------------------------------
  // 2. VALIDATE PAYMENT EVENT
  // ---------------------------------------------------------
  const eventType = event?.type;
  console.log("🔎 Detected eventType:", eventType);

  if (eventType !== "payment.created") {
    console.log("⚠️ Ignored non-payment event");
    return res.send("Ignored: Not a payment event");
  }

  const buyerEmail =
    event?.data?.object?.payment?.buyer_email_address;

  console.log("📧 Buyer Email:", buyerEmail);

  if (!buyerEmail) {
    console.log("❌ No buyer email found in event");
    return res.send("No buyer email found");
  }

  // ---------------------------------------------------------
  // 3. CONNECT TO APPWRITE
  // ---------------------------------------------------------

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);

  console.log(
    "DEBUG ENV:",
    JSON.stringify({
      endpoint: process.env.APPWRITE_ENDPOINT,
      project: process.env.APPWRITE_PROJECT_ID,
      db: process.env.APPWRITE_DB_ID,
      col: process.env.USER_COLLECTION_ID,
    })
  );

  // ---------------------------------------------------------
  // 4. FIND USER BY EMAIL
  // ---------------------------------------------------------
  let users;
  try {
    users = await db.listDocuments(
      process.env.APPWRITE_DB_ID,
      process.env.USER_COLLECTION_ID,
      [Query.equal("email", buyerEmail)]
    );
  } catch (err) {
    console.log("❌ DB Query Failed:", err.message);
    return res.send("DB Query error");
  }

  console.log("🔎 DB Query Result:", users);

  if (!users || users.documents.length === 0) {
    console.log("❌ No matching user found for:", buyerEmail);
    return res.send("NO USER FOUND");
  }

  const userDoc = users.documents[0];
  console.log("👉 Matched User Document:", userDoc);

  // ---------------------------------------------------------
  // 5. UPDATE USER ACCESS
  // ---------------------------------------------------------
  try {
    await db.updateDocument(
      process.env.APPWRITE_DB_ID,
      process.env.USER_COLLECTION_ID,
      userDoc.$id,
      {
        canViewCatalog: true,
      }
    );

    console.log("✅ SUCCESS: Catalog access granted!");
    return res.send("SUCCESS");
  } catch (err) {
    console.log("❌ Update Failed:", err.message);
    return res.send("UPDATE ERROR");
  }
}
