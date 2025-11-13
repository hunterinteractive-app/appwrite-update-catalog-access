import { Client, Databases, Query } from "node-appwrite";

export default async function (context) {
  context.log("📥 Function Triggered");

  // Ensure raw body exists
  const raw = context.req.bodyRaw;
  if (!raw) {
    context.log("⚠️ No raw body");
    context.res = { status: 400, body: "Missing raw body" };
    return;
  }

  // Parse JSON
  let event;
  try {
    event = JSON.parse(raw);
  } catch (err) {
    context.error("❌ JSON parse error:", err);
    context.res = { status: 400, body: "Invalid JSON" };
    return;
  }

  context.log("📦 Raw Payload:", JSON.stringify(event));

  // Detect event type
  const eventType = event?.type;
  context.log("🔎 Event Type:", eventType);

  if (eventType !== "payment.created") {
    context.log("⚠️ Ignored — not a payment event.");
    context.res = { status: 200, body: "Ignored" };
    return;
  }

  // Extract buyer email
  const buyerEmail =
    event?.data?.object?.payment?.buyer_email_address ||
    event?.data?.payment?.buyer_email_address;

  context.log("📧 Buyer Email:", buyerEmail);

  if (!buyerEmail) {
    context.log("❌ Missing buyer_email_address");
    context.res = { status: 400, body: "Missing email" };
    return;
  }

  // Appwrite client setup
  const client = new Client()
    .setEndpoint(context.env.APPWRITE_ENDPOINT)
    .setProject(context.env.APPWRITE_PROJECT_I
