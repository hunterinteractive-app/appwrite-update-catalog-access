const sdk = require("node-appwrite");

module.exports = async (req, res) => {
  const client = new sdk.Client()
    .setEndpoint("https://cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);

  try {
    if (!req.body) throw new Error("Missing request body");
    const data = JSON.parse(req.body);
    const email = data.email?.toLowerCase().trim();
    const catalogYear = data.catalogYear || new Date().getFullYear();

    if (!email) throw new Error("Missing email");

    console.log(`Granting catalog access for ${email}`);

    const result = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_ID,
      [sdk.Query.equal("email", email)]
    );

    if (result.total === 0) throw new Error(`User not found: ${email}`);

    const userDoc = result.documents[0];

    await databases.updateDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_ID,
      userDoc.$id,
      {
        canViewCatalog: true,
        catalogYear,
        accessGrantedAt: new Date().toISOString(),
      }
    );

    res.json({ success: true, message: `Access granted for ${email}` });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
};
