// src/services/storageService.js
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
} from "firebase/storage";
import { auth } from "../firebase";

// Inicializar o serviço de armazenamento do Firebase
const storage = getStorage();

/**
 * Obtém a URL de download de um arquivo
 * @param {string} path - Caminho do arquivo no Storage
 * @returns {Promise<string>} URL do arquivo
 */
export const getFileURL = async (path) => {
  try {
    const fileRef = ref(storage, path);
    return await getDownloadURL(fileRef);
  } catch (error) {
    throw error;
  }
};

/**
 * Lista todos os documentos de um usuário
 * @param {string} firebaseUid - Firebase UID do usuário
 * @returns {Promise<Array>} Lista de documentos
 */
export const getUserDocuments = async (firebaseUid) => {
  try {
    // Verificar se o usuário está autenticado
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Usuário não autenticado");
    }

    if (!firebaseUid) {
      return [];
    }

    // Verificar o token de autenticação
    try {
      await currentUser.getIdToken();
    } catch (tokenError) {
      throw new Error("Erro de autenticação");
    }

    const userDocsRef = ref(storage, `users/${firebaseUid}/files`);
    const listResult = await listAll(userDocsRef);

    if (listResult.items.length === 0) {
      return [];
    }

    const documents = await Promise.all(
      listResult.items.map(async (itemRef) => {
        try {
          // Verificar se ainda estamos autenticados antes de cada getDownloadURL
          if (!auth.currentUser) {
            return null;
          }

          const url = await getDownloadURL(itemRef);

          return {
            name: itemRef.name,
            path: itemRef.fullPath,
            url: url,
            timestamp: itemRef.name.split("_")[0],
            originalName: itemRef.name.split("_").slice(1).join("_"),
          };
        } catch (error) {
          return null;
        }
      })
    );

    const validDocuments = documents.filter((doc) => doc !== null);
    return validDocuments;
  } catch (error) {
    // Verificar tipos específicos de erro
    if (error.code === "storage/object-not-found") {
      return [];
    }

    if (error.code === "storage/unauthorized") {
      throw new Error("Sem permissão para acessar os documentos");
    }

    if (error.code === "storage/unknown") {
      // Tentar reautenticar
      try {
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true); // Force refresh
        }
      } catch (refreshError) {
        // Silenciar erro de refresh
      }
    }

    return [];
  }
};

/**
 * Exclui um arquivo do Firebase Storage
 * @param {string} path - Caminho completo do arquivo no Storage
 * @returns {Promise<boolean>}
 */
export const deleteFileFromStorage = async (path) => {
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Verifica se um arquivo existe no storage
 * @param {string} path - Caminho do arquivo
 * @returns {Promise<boolean>}
 */
export const fileExists = async (path) => {
  try {
    const fileRef = ref(storage, path);
    await getDownloadURL(fileRef);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Obtém metadados de um arquivo
 * @param {string} path - Caminho do arquivo
 * @returns {Promise<Object>}
 */
export const getFileMetadata = async (path) => {
  try {
    const fileRef = ref(storage, path);
    const metadata = await getMetadata(fileRef);
    return metadata;
  } catch (error) {
    throw error;
  }
};

/**
 * Faz upload da imagem de perfil do estabelecimento
 * @param {File} file - Arquivo da imagem
 * @param {string} storeId - ID do estabelecimento
 * @returns {Promise<string>} URL da imagem
 */
export const uploadStoreProfileImage = async (file, storeId) => {
  try {
    // Verificar se o usuário está autenticado
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Usuário não autenticado");
    }

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tipo de arquivo não permitido. Use JPG, PNG ou WebP.");
    }

    // Validar tamanho do arquivo (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("Arquivo muito grande. Máximo 5MB.");
    }

    // Criar nome único para o arquivo
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}_profile.${fileExtension}`;

    // Definir caminho no storage
    const filePath = `store/perfil/${storeId}/${fileName}`;
    const fileRef = ref(storage, filePath);

    // Fazer upload
    const snapshot = await uploadBytes(fileRef, file);

    // Obter URL de download
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    throw error;
  }
};

export const uploadMotoboyImage = async (file, id) => {
  try {
    // Verificar se o usuário está autenticado
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Usuário não autenticado");
    }
    // Criar nome único para o arquivo
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}_motoboy.${fileExtension}`;

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tipo de arquivo não permitido. Use JPG, PNG ou WebP.");
    }

    // Validar tamanho do arquivo (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("Arquivo muito grande. Máximo 5MB.");
    }

    // Criar caminho no storage
    const filePath = `motoboys/perfil/${id}/${fileName}`;
    const fileRef = ref(storage, filePath);

    // Fazer upload
    const snapshot = await uploadBytes(fileRef, file);

    // Obter URL de download
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    throw error;
  }
};

/**
 * Exclui a imagem de perfil anterior do estabelecimento
 * @param {string} imageUrl - URL da imagem a ser excluída
 * @returns {Promise<boolean>}
 */
export const deleteStoreProfileImage = async (imageUrl) => {
  try {
    if (!imageUrl) return true;

    // Extrair o caminho da URL do Firebase Storage
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);

    if (pathMatch) {
      const path = decodeURIComponent(pathMatch[1]);
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
    }

    return true;
  } catch (error) {
    console.warn("Erro ao excluir imagem anterior:", error);
    return false; // Não bloquear o processo se não conseguir excluir
  }
};

export default {
  getFileURL,
  getUserDocuments,
  deleteFileFromStorage,
  fileExists,
  getFileMetadata,
  uploadStoreProfileImage,
  deleteStoreProfileImage,
};
