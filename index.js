import sdk from "node-appwrite";

export default async ({ req, res, log, error, env }) => {
  // Allow Square to POST without CORS issues
  res.setHeader("Content-Type", "application/json");

  log("📥 Function Triggered");

  // Pull raw JSON body
  const raw = req.bodyRaw;
  log("📦 Raw Payload:", raw);

  if (!raw) {
    error("❌ No body received");
    return res.send("No body", 400);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    error("❌ Failed to parse JSON:", err);
    return res.send("Invalid JSON", 400);
  }

  const eventType = payload.type || payload.event_type || "";
  log("🔎 Detected eventType:", eventType);

  if (!eventType.includes("payment")) {
    log("⚠️ Ignored non-payment event");
    return res.send("Ignored", 200);
  }

  // Extract buyer email
  const email =
    payload?.data?.object?.payment?.buyer_email_address ||
    payload?.data?.object?.order?.fulfillments?.[0]?.recipient?.email_address ||
    null;

  if (!email) {
    error("❌ No buyer email found in webhook");
    return res.send("No buyer email", 400);
  }

  log("📧 Buyer Email:", email);

  // Initialize Appwrite client
  const client = new sdk.Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);

  // Query matching user
  let userDocs;
  try {
    userDocs = await databases.listDocuments(
      env.USER_DATABASE_ID,
      env.USER_COLLECTION_ID,
      [sdk.Query.equal("email", email)]
    );
  } catch (err) {
    error("❌ DB Query Failed:", err);
    return res.send("DB query failed", 500);
  }

  log("📊 Query result:", JSON.stringify(userDocs, null, 2));

  if (userDocs.total === 0) {
    error("❌ No user found with that email");
    return res.send("User not found", 404);
  }

  const user = userDocs.documents[0];
  log("✅ Matching user:", user.$id);

  // Update catalog access
  try {
    await databases.updateDocument(
      env.USER_DATABASE_ID,
      env.USER_COLLECTION_ID,
      user.$id,
      {
        canViewCatalog: true,
        catalogYear: 2024,
        accessGrantedAt: new Date().toISOString(),
      }
    );
  } catch (err) {
    error("❌ Failed updating user:", err);
    return res.send("Database update error", 500);
  }

  log("🎉 SUCCESS — Catalog access granted.");
  return res.send("OK", 200);
};
