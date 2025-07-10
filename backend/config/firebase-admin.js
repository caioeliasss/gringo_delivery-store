const admin = require("firebase-admin");

// Inicializar Firebase Admin se ainda não foi inicializado
if (!admin.apps.length) {
  // Use a variável de ambiente ou arquivo de service account
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : require("./serviceAccountKey.json"); // Arquivo baixado do Firebase Console

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  console.log("🔥 Firebase Admin inicializado");
}

module.exports = admin;
