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

export default {
  getFileURL,
  getUserDocuments,
  deleteFileFromStorage,
  fileExists,
  getFileMetadata,
};
