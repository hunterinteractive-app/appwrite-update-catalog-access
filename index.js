const sdk = require("node-appwrite");

/*
POST BODY FORMAT EXPECTED:
{
   "email": "buyer@example.com",
   "year": 2024
}
*/

module.exports = async function (req, res) {
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);   // API Key with Database Write permission

  const db = new sdk.Databases(client);

  try {
    // 1️⃣ Parse incoming webhook POST body
    const body = JSON.parse(req.body || "{}");

    if (!body.email) {
      return res.json({ error: "Missing email in request body"});
    }

    const email = body.email.toLowerCase();
    const catalogYear = body.year || 2024;

    // 2️⃣ Find the user document by email
    const users = await db.listDocuments(
      process.env.USER_DB_ID,
      process.env.USER_COLLECTION_ID,
      [ sdk.Query.equal("email", email) ]
    );

    if (users.total === 0) {
      return res.json({ error: "User not found in database" });
    }

    const userDoc = users.documents[0];

    // 3️⃣ Update their access
    await db.updateDocument(
      process.env.USER_DB_ID,
      process.env.USER_COLLECTION_ID,
      userDoc.$id,
      {
        canViewCatalog: true,
        catalogYear: catalogYear,
        accessGrantedAt: new Date().toISOString()
      }
    );

    return res.json({
      success: true,
      message: "Catalog access granted",
      email: email
    });

  } catch (err) {
    return res.json({
      error: err.message || "Function error"
    });
  }
};
