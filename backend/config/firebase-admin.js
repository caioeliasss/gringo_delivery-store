const admin = require("firebase-admin");
const path = require("path");

// Inicializar Firebase Admin se ainda não foi inicializado
if (!admin.apps.length) {
  try {
    let serviceAccount;

    // Tentar usar variável de ambiente primeiro
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("🔥 Usando Firebase Service Account da variável de ambiente");
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // Tentar carregar do arquivo
      const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
      console.log(
        "🔥 Tentando carregar Firebase Service Account do arquivo:",
        serviceAccountPath
      );

      try {
        serviceAccount = require(serviceAccountPath);
        console.log("✅ Firebase Service Account carregado do arquivo");
      } catch (fileError) {
        console.error(
          "❌ Erro ao carregar serviceAccountKey.json:",
          fileError.message
        );
        console.log("📝 Instruções:");
        console.log(
          "1. Acesse o Firebase Console (https://console.firebase.google.com)"
        );
        console.log("2. Vá em Project Settings > Service Accounts");
        console.log("3. Clique em 'Generate New Private Key'");
        console.log(
          "4. Baixe o arquivo JSON e renomeie para 'serviceAccountKey.json'"
        );
        console.log(
          "5. Coloque o arquivo em: backend/config/serviceAccountKey.json"
        );
        console.log(
          "6. Ou configure a variável de ambiente FIREBASE_SERVICE_ACCOUNT"
        );
        throw new Error("Firebase Service Account não configurado");
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
      storageBucket: `${serviceAccount.project_id}.firebasestorage.app`, // Corrigir para .firebasestorage.app
    });

    console.log("✅ Firebase Admin inicializado com sucesso");
    console.log("📧 Project ID:", serviceAccount.project_id);
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase Admin:", error.message);
    throw error;
  }
}

module.exports = admin;
