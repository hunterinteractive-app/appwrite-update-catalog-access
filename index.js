import { Client, Databases, Query } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  try {
    // 1. Parse raw body
    let rawBody = req.bodyRaw || "";
    log("📦 Raw Payload:", rawBody);

    if (!rawBody || rawBody.trim() === "") {
      log("⚠️ No body received");
      return res.send("No body", 200);
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (err) {
      error("❌ Failed to parse JSON:", err);
      return res.send("Invalid JSON", 400);
    }

    // 2. Extract event type
    const eventType = body?.type || "";
    log("🔎 Detected eventType:", eventType);

    if (eventType !== "payment.created") {
      log("⚠️ Ignored non-payment event");
      return res.send("Ignored event", 200);
    }

    // 3. Extract customer email
    const email =
      body?.data?.object?.payment?.buyer_email_address ||
      body?.data?.object?.order?.customer_id ||
      null;

    log("📧 Buyer Email:", email);

    if (!email) {
      error("❌ Missing buyer email");
      return res.send("Missing email", 400);
    }

    // 4. Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // 5. Lookup user in DB
    const dbId = process.env.USER_DATABASE_ID;
    const collectionId = process.env.USER_COLLECTION_ID;

    log(`🔍 Searching DB for email: ${email}`);

    const result = await databases.listDocuments(dbId, collectionId, [
      Query.equal("email", email),
    ]);

    log("📄 Query Result:", JSON.stringify(result, null, 2));

    if (!result.documents.length) {
      error("❌ No matching user found");
      return res.send("User not found", 404);
    }

    const user = result.documents[0];

    // 6. Update DB row
    log(`🔧 Updating user ${user.$id}`);

    await databases.updateDocument(dbId, collectionId, user.$id, {
      canViewCatalog: true,
      accessGrantedAt: new Date().toISOString(),
    });

    log("✅ User updated successfully");
    return res.send("Updated", 200);
  } catch (err) {
    error("❌ Unhandled Error:", err);
    return res.send("Internal error", 500);
  }
};
