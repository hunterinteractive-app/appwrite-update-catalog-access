import { Client, Databases, Query } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  try {
    log("📥 Square webhook received");

    // Parse Square payload
    const body = req.bodyRaw ? JSON.parse(req.bodyRaw) : {};
    log("📦 Payload: " + JSON.stringify(body));

    // Validate event type
    const eventType = body.type || "";
    if (!eventType.startsWith("payment.") && !eventType.startsWith("order.")) {
      log("⚠️ Ignored event: " + eventType);
      return res.send("Ignored event");
    }

    // Extract customer email
    let email = body?.data?.object?.payment?.buyer_email_address
      || body?.data?.object?.order?.buyer_email
      || null;

    if (!email) {
      log("❌ No email found in payload");
      return res.json({ success: false, error: "No email found" });
    }

    log("📧 Buyer email: " + email);

    // Setup Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const databaseId = process.env.APPWRITE_DB_ID;
    const collectionId = process.env.APPWRITE_USERS_COLLECTION_ID;

    // Query for user by email
    const users = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("email", email),
    ]);

    if (users.total === 0) {
      log("❌ No Appwrite user found for email: " + email);
      return res.json({ success: false, error: "User not found" });
    }

    const userDoc = users.documents[0];

    log("👤 Updating user document: " + userDoc.$id);

    // Update user access
    await databases.updateDocument(databaseId, collectionId, userDoc.$id, {
      canViewCatalog: true,
      catalogYear: 2024,
      accessGrantedAt: new Date().toISOString(),
    });

    log("✅ Catalog access granted");

    return res.json({ success: true });
  } catch (err) {
    error("🔥 Error: " + err.message);
    return res.json({ success: false, error: err.message });
  }
};
