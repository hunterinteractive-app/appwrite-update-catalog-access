export default async ({ req, res, log, error }) => {
  log("📥 Function Triggered");

  // Appwrite Functions v3+: use req.body, not req.bodyRaw
  const raw = req.body || "{}";

  log("📦 Raw Payload:", raw);

  let payload;
  try {
    payload = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (err) {
    error("❌ Failed to parse JSON:", err);
    return res.send("Invalid JSON");
  }

  // Identify event type
  const eventType =
    payload?.type ||
    payload?.event_type ||
    payload?.data?.type ||
    "";

  log("🔎 Detected eventType:", eventType);

  if (!eventType.includes("payment")) {
    log("⚠️ Ignored non payment event");
    return res.send("Ignored");
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
