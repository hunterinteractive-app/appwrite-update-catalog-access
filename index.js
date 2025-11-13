import { Client, Databases, Query } from "node-appwrite";

export default async function(req, res, context) {
  // ----------------------------
  // 1. DEBUG ENV VARS
  // ----------------------------
  context.log("DEBUG ENV:", {
    endpoint: process.env.APPWRITE_ENDPOINT,
    project: process.env.APPWRITE_PROJECT_ID,
    apiKey: process.env.APPWRITE_API_KEY ? "[SET]" : "[MISSING]",
    db: process.env.APPWRITE_DATABASE_ID,
    col: process.env.USER_COLLECTION_ID,
  });

  // ----------------------------
  // 2. Read raw request body
  // ----------------------------
  context.log("📥 Appwrite Function Triggered");

  if (!req.bodyRaw) {
    context.error("❌ No req.bodyRaw received");
    return res.send("Missing body", 400);
  }

  context.log("📦 Raw Payload:", req.bodyRaw);

  let body = {};
  try {
    body = JSON.parse(req.bodyRaw);
  } catch (err) {
    context.error("❌ Failed to parse JSON:", err.message);
    return res.send("Invalid JSON", 400);
  }

  // ----------------------------
  // 3. Extract event + buyer email
  // ----------------------------
  const eventType = body.type || body.event_type;
  context.log("🔎 Detected eventType:", eventType);

  if (eventType !== "payment.created") {
    context.log("⚠️ Ignored event:", eventType);
    return res.send("Ignored", 200);
  }

  const buyerEmail =
    body.data?.object?.payment?.buyer_email_address ||
    body.data?.object?.order?.buyer_email ||
    null;

  context.log("📧 Buyer Email:", buyerEmail);

  if (!buyerEmail) {
    context.error("❌ No buyer_email_address found in webhook");
    return res.send("Missing email", 400);
  }

  // ----------------------------
  // 4. Init Appwrite Client
  // ----------------------------
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const dbId = process.env.APPWRITE_DATABASE_ID;
  const colId = process.env.USER_COLLECTION_ID;

  const databases = new Databases(client);

  // ----------------------------
  // 5. Query DB for user by email
  // ----------------------------
  let userDocList;

  try {
    userDocList = await databases.listDocuments(
      dbId,
      colId,
      [Query.equal("email", buyerEmail)]
    );

    context.log("📁 DB Query Result Count:", userDocList.total);
  } catch (err) {
    context.error("❌ DB Query Failed:", err.message);
    return res.send("DB query error", 500);
  }

  if (userDocList.total === 0) {
    context.error("❌ No user found for email:", buyerEmail);
    return res.send("No matching user", 404);
  }

  const document = userDocList.documents[0];
  context.log("📄 Found document:", document.$id);

  // ----------------------------
  // 6. Update catalog access
  // ----------------------------
  try {
    const updated = await databases.updateDocument(
      dbId,
      colId,
      document.$id,
      {
        canViewCatalog: true,
        catalogYear: 2024,
        accessGrantedAt: new Date().toISOString()
      }
    );

    context.log("✅ Catalog Access Updated:", updated.$id);
  } catch (err) {
    context.error("❌ Failed to update document:", err.message);
    return res.send("Update error", 500);
  }

  return res.send("Success", 200);
}
