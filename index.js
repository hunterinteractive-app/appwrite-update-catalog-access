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
    return res.sen
