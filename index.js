import { Client, Databases, Query } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  log("📥 Appwrite Function Triggered");

  //
  // 1️⃣ PARSE BODY SAFELY (Appwrite uses req.bodyRaw)
  //
  let body = {};
  try {
    if (req.bodyRaw) {
      body = JSON.parse(req.bodyRaw);
      log("📦 Raw Payload: " + JSON.stringify(body));
    } else {
      log("⚠️ No req.bodyRaw received");
    }
  } catch (err) {
    error("❌ Failed to parse JSON: " + err.message);
    return res.json({ success: false, error: "Invalid JSON received" });
  }

  //
  // 2️⃣ DETECT EVENT TYPE FROM ANY POSSIBLE SQUARE FORMAT
  //
  const eventType =
    body.type ||
    body.event_type ||
    body.data?.type ||
    body.data?.object?.type ||
    body.data?.object?.payment?.type ||
    body.object?.type ||
    "";

  log("🔎 Detected eventType: " + eventType);

  if (
    !eventType.startsWith("payment.") &&
    !eventType.startsWith("order.")
  ) {
    log("⚠️ Ignored event due to missing or unknown event type");
    return res.send("Ignored event");
  }

  //
  // 3️⃣ EXTRACT BUYER EMAIL (Square formats vary!)
  //
  let email =
    body.data?.object?.payment?.buyer_email_address ||
    body.data?.object?.order?.buyer_email ||
    body.data?.object?.buyer_email ||
    body.buyer_email ||
    null;

  if (!email) {
    log("❌ No email found in payload");
    return res.json({ success: false, error: "No email provided in Square event" });
  }

  log("📧 Buyer Email: " + email);

  //
  // 4️⃣ SETUP APPWRITE CLIENT
  //
  const client = new Client();
  try {
    client
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
  } catch (err) {
    error("❌ Failed to configure Appwrite client: " + err.message);
    return res.json({ success: false, error: "Appwrite client config error" });
  }

  const databases = new Databases(client);

  const databaseId = process.env.APPWRITE_DB_ID;
  const collectionId = process.env.APPWRITE_USERS_COLLECTION_ID;

  //
  // 5️⃣ FIND USER DOCUMENT BY EMAIL
  //
  let users;
  try {
    users = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("email", email),
    ]);
  } catch (err) {
    error("❌ DB Query Failed: " + err.message);
    return res.json({ success: false, error: "Database lookup failed" });
  }

  if (users.total === 0) {
    log("❌ No Appwrite user found matching email: " + email);
    return res.json({ success: false, error: "User not found in Appwrite DB" });
  }

  const userDoc = users.documents[0];
  log("👤 User matched: " + userDoc.$id);

  //
  // 6️⃣ UPDATE USER DOCUMENT (GRANT CATALOG ACCESS)
  //
  try {
    await databases.updateDocument(databaseId, collectionId, userDoc.$id, {
      canViewCatalog: true,
      catalogYear: 2024,
      accessGrantedAt: new Date().toISOString(),
    });

    log("✅ Catalog access updated successfully!");
    return res.json({ success: true, userId: userDoc.$id });
  } catch (err) {
    error("🔥 Failed to update user document: " + err.message);
    return res.json({ success: false, error: err.message });
  }
};
