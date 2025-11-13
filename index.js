// Parse JSON safely
let body = {};
try {
  body = req.bodyRaw ? JSON.parse(req.bodyRaw) : {};
} catch (err) {
  log("❌ Failed to parse body: " + err.message);
}

// Determine event type from multiple possible locations
const eventType =
  body.type ||
  body.event_type ||
  body.data?.type ||
  body.data?.object?.type ||
  body.data?.object?.payment?.type ||
  body.object?.type ||
  "";

// Log the detected type
log("🔎 Detected eventType: " + eventType);

if (!eventType.startsWith("payment.") && !eventType.startsWith("order.")) {
  log("⚠️ Ignored event due to unknown type");
  return res.send("Ignored event");
}
