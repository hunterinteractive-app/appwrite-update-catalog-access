import { Client, Databases, Query } from "appwrite";

export default async function (req, res) {
  res.setHeader("Content-Type", "application/json");

  // ---------------------------------------------------------
  // 0. LOG RAW BODY
  // ---------------------------------------------------------
  console.log("📥 Function Triggered");

  let raw = req.bodyRaw || "";
  console.log("📦 Raw Payload:", raw);

  // Handle empty body
  if (!raw || raw.trim() === "") {
    console.log("❌ Empty body received");
    return res.send("Ignored: Empty body");
  }

  // ---------------------------------------------------------
  // 1. SAFE JSON PARSE
  // ---------------------------------------------------------
  let event;
  try {
    event = JSON.parse(raw);
  } catch (err) {
    console.log("❌ Failed to parse JSON:", err.message);
    return res.send("JSON parse error");
  }

  console.log("🔎 Parsed Event:", event);

  // ---------------------------------------------------------
  // 2. VALIDATE PAYMENT EVENT
  // ---------------------------------------------------------
  const eventType = event?.type;
  console.log("🔎 Detected eventType:", eventType);

  if (eventType !== "payment.created") {
    console.log("⚠️ Ignored non-payment event");
    return res.send("Ignored: Not a payment event");
  }

  const buyerEmail =
    event?.data?.object?.payment?.buyer_email_address;

  console.log("📧 Buyer Email:", buyerEmail);

  if (!buyerEmail) {
    console.log("❌ No buyer
