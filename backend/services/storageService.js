const admin = require("../config/firebase-admin");
// Inicializar Firebase Storage bucket
let bucket;
try {
  bucket = admin.storage().bucket();
} catch (error) {
  const app = admin.app();
  const projectId = app.options.projectId;
  const bucketName = `${projectId}.firebasestorage.app`;
  bucket = admin.storage().bucket(bucketName);
}

/**
 * Faz upload da imagem de perfil do motoboy
 * @param {Buffer} fileBuffer - Buffer do arquivo da imagem
 * @param {string} originalname - Nome original do arquivo
 * @param {string} mimetype - Tipo MIME do arquivo
 * @param {number} size - Tamanho do arquivo em bytes
 * @param {string} motoboyId - ID do motoboy
 * @returns {Promise<string>} URL da imagem
 */
const uploadMotoboyImage = async (
  fileBuffer,
  originalname,
  mimetype,
  size,
  motoboyId
) => {
  try {
    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(mimetype)) {
      throw new Error("Tipo de arquivo não permitido. Use JPG, PNG ou WebP.");
    }

    // Validar tamanho do arquivo (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (size > maxSize) {
      throw new Error("Arquivo muito grande. Máximo 5MB.");
    }

    // Criar nome único para o arquivo (igual ao frontend)
    const timestamp = Date.now();
    const fileExtension = originalname.split(".").pop();
    const fileName = `motoboys/perfil/${motoboyId}/${timestamp}_motoboy.${fileExtension}`;

    console.log(`📁 Iniciando upload da imagem do motoboy: ${fileName}`);

    // Criar referência do arquivo no Firebase Storage
    const fileRef = bucket.file(fileName);

    // Upload do arquivo (mesmo método do frontend)
    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: mimetype,
        metadata: {
          originalName: originalname,
          motoboyId: motoboyId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`✅ Upload concluído: ${fileName}`);

    // Tornar o arquivo público
    await fileRef.makePublic();

    // Obter URL de download usando Admin SDK
    const downloadURL = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log(`🌐 URL de download gerada: ${downloadURL}`);

    return downloadURL;
  } catch (error) {
    console.error("Erro no upload da imagem:", error);
    throw error;
  }
};

/**
 * Exclui uma imagem do Firebase Storage
 * @param {string} imageUrl - URL da imagem a ser excluída
 * @returns {Promise<boolean>}
 */
const deleteMotoboyImage = async (imageUrl) => {
  try {
    if (!imageUrl) return true;

    // Extrair o caminho da URL do Firebase Storage
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);

    if (pathMatch) {
      const path = decodeURIComponent(pathMatch[1]);
      const fileRef = bucket.file(path);
      await fileRef.delete();
      console.log(`🗑️ Imagem excluída: ${path}`);
    }

    return true;
  } catch (error) {
    console.warn("Erro ao excluir imagem anterior:", error);
    return false; // Não bloquear o processo se não conseguir excluir
  }
};

module.exports = {
  uploadMotoboyImage,
  deleteMotoboyImage,
};
