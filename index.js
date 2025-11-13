import { Client, Databases, Query } from "node-appwrite";

export default async function (context) {
  context.log("📥 Function Triggered");

  let rawBody = context.req.bodyRaw;

  if (!rawBody || rawBody.length === 0) {
    context.log("⚠️ No bodyRaw provided");
    context.res = { status: 400, body: "Missing raw body" };
    return;
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    context.error("❌ Failed to parse JSON:", e);
    context.res = { status: 400, body: "Invalid JSON" };
    return;
  }

  context.log("📦 Raw Payload:", JSON.stringify(event));

  const eventType = event?.type;
  context.log("🔎 Detected eventType:", eventType);

  if (eventType !== "payment.created") {
    context.log("⚠️ Ignored non payment event");
    context.res = { status: 200, body: "Ignored" };
    return;
  }

  const buyerEmail = event?.data?.object?.payment?.buyer_email_address;
  context.log("📧 Buyer Email:", buyerEmail);

  if (!buyerEmail) {
    context.log("❌ Missing buyer_email_address in event");
    context.res = { status: 400, body: "Missing email" };
    return;
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(context.env.APPWRITE_ENDPOINT)
    .setProject(context.env.APPWRITE_PROJECT_ID)
    .setKey(context.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const databaseId = context.env.USER_DATABASE_ID;
  const collectionId = context.env.USER_COLLECTION_ID;

  context.log("🔧 DB:", { databaseId, collectionId });

  // Lookup user row by email
  let userRows;
  try {
    userRows = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("email", buyerEmail),
    ]);
  } catch (err) {
    context.error("❌ DB Query Failed:", err);
    context.res = { status: 500, body: "DB query failed" };
    return;
  }

  context.log("📊 Query result:", JSON.stringify(userRows));

  if (!userRows?.documents?.length) {
    context.log("⚠️ No matching user found");
    context.res = { status: 200, body: "No matching user" };
    return;
  }

  const user = userRows.documents[0];
  context.log("👤 User found:", JSON.stringify(user));

  // Update matching record
  try {
    await databases.updateDocument(
      databaseId,
      collectionId,
      user.$id,
      {
        canViewCatalog: true,
        accessGrantedAt: new Date().toISOString(),
      }
    );
    context.log("✅ User access updated successfully");
  } catch (err) {
    context.error("❌ Failed to update document:", err);
    context.res = { status: 500, body: "Update failed" };
    return;
  }

  context.res = { status: 200, body: "Catalog access updated" };
}
