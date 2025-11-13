import { Client, Databases, Query } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  log("📥 Function Triggered");

  // Raw Square payload
  log("📦 Raw Payload:", JSON.stringify(req.bodyRaw || {}));

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(req.bodyRaw);
  } catch (e) {
    error("❌ Failed to parse JSON:", e);
    return res.send("Invalid JSON");
  }

  // Identify Square event type
  const eventType = payload?.type || payload?.event_type || "";
  log("🔎 Detected eventType:", eventType);

  if (!eventType.includes("payment")) {
    log("⚠️ Ignored non-payment event");
    return res.send("Ignored event");
  }

  // Extract buyer email
  const buyerEmail =
    payload?.data?.object?.payment?.buyer_email_address ||
    payload?.data?.object?.order?.buyer_email_address ||
    null;

  if (!buyerEmail) {
    error("❌ No buyer email found in payload!");
    return res.send("Missing email");
  }

  log("📧 Buyer Email:", buyerEmail);

  // ------- Appwrite Client -------
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);

  const dbId = "690696ac002796e1d81b"; // exhibitor_db
  const usersCollection = "691538490013ed9a0643"; // NEW fixed collection ID

  // -------- Lookup User by Email --------
  let userDocs;
  try {
    log("🔍 Querying DB for email:", buyerEmail);

    userDocs = await db.listDocuments(dbId, usersCollection, [
      Query.equal("email", buyerEmail),
    ]);

    log("📄 Query Result:", JSON.stringify(userDocs.documents));
  } catch (err) {
    error("❌ DB Query Error:", err);
    return res.send("DB query failed");
  }

  if (userDocs.documents.length === 0) {
    error("❌ No matching user found for email:", buyerEmail);
    return res.send("User not found");
  }

  const user = userDocs.documents[0];
  log("✅ User Found:", JSON.stringify(user));

  // ------- Update User Access -------
  try {
    const updateResult = await db.updateDocument(
      dbId,
      usersCollection,
      user.$id,
      {
        canViewCatalog: true,
        catalogYear: 2024,
        accessGrantedAt: new Date().toISOString(),
      }
    );

    log("🎉 User updated:", JSON.stringify(updateResult));
    return res.send("Success");
  } catch (err) {
    error("❌ Update Failed:", err);
    return res.send("Update failed");
  }
};
