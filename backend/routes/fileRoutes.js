// backend/controllers/const js
const File = require("../models/File");
const express = require("express");
const router = express.Router();
// Listagem de arquivos
const listFiles = async (req, res) => {
  try {
    const { uploadedBy, isPublic, tag } = req.query;

    // Construir filtro baseado nos parâmetros
    let filter = {};

    // Filtrar por usuário
    if (uploadedBy) {
      filter.uploadedBy = uploadedBy;
    }

    // Filtrar por visibilidade pública
    if (isPublic !== undefined) {
      filter.isPublic = isPublic === "true";
    }

    // Filtrar por tag
    if (tag) {
      filter.tags = tag;
    }

    // Se o usuário não for admin e não estiver buscando arquivos públicos,
    // mostrar apenas os próprios arquivos
    if (!isPublic) {
      filter.uploadedBy = req.user.uid;
    }

    const files = await File.find(filter).sort({ uploadedAt: -1 });

    res.json(files);
  } catch (error) {
    console.error("Erro ao listar arquivos:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar arquivos", error: error.message });
  }
};

// Obter detalhes de um arquivo
const getFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await File.findById(id);

    if (!file) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    }

    // Verificar permissão: o arquivo é do usuário ou é público
    if (
      file.uploadedBy !== req.user.uid &&
      !file.isPublic &&
      !req.user.isAdmin
    ) {
      return res.status(403).json({ message: "Acesso negado a este arquivo" });
    }

    res.json(file);
  } catch (error) {
    console.error("Erro ao obter arquivo:", error);
    res
      .status(500)
      .json({ message: "Erro ao obter arquivo", error: error.message });
  }
};

// Salvar informações do arquivo no banco de dados (URL já gerada pelo frontend)
const saveFile = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      size,
      fileUrl,
      storagePath,
      thumbnailUrl,
      tags,
      isPublic,
      notification,
    } = req.body;

    // Validar campos obrigatórios
    if (!name || !type || !fileUrl || !storagePath) {
      return res.status(400).json({ message: "Campos obrigatórios ausentes" });
    }

    // Criar novo documento de arquivo
    const file = new File({
      name,
      description: description || "Sem descrição",
      type,
      size: size || 0,
      fileUrl,
      storagePath,
      uploadedBy: req.user.uid,
      thumbnailUrl,
      tags: tags || [],
      isPublic: isPublic || false,
    });

    // Salvar no banco de dados
    await file.save();
    // Salvar notificação se fornecida
    console.log("Notification data:", notification);
    if (notification) {
      try {
        const notificationService = require("../services/notificationService");
        const emailService = require("../services/emailService");
        await notificationService.notifySupport(notification);
        console.log(
          "Notificação enviada para o suporte ",
          notification.motoboy
        );
        await emailService.newDocumentUploaded(notification.motoboyName);
      } catch (error) {
        console.error("Erro ao enviar notificação:", error);
      }
    }

    res.status(201).json(file);
  } catch (error) {
    console.error("Erro ao salvar arquivo:", error);
    res
      .status(500)
      .json({ message: "Erro ao salvar arquivo", error: error.message });
  }
};

// Atualizar informações do arquivo
const updateFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, tags, isPublic } = req.body;

    const file = await File.findById(id);

    if (!file) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    }

    // Verificar permissão: somente o dono pode atualizar o arquivo
    if (file.uploadedBy !== req.user.uid && !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Acesso negado para atualizar este arquivo" });
    }

    // Atualizar campos permitidos
    if (name) file.name = name;
    if (description) file.description = description;
    if (tags) file.tags = tags;
    if (isPublic !== undefined) file.isPublic = isPublic;

    await file.save();

    res.json(file);
  } catch (error) {
    console.error("Erro ao atualizar arquivo:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar arquivo", error: error.message });
  }
};

// Excluir arquivo do banco de dados
// Nota: A exclusão do Storage deve ser feita pelo frontend
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await File.findById(id);

    if (!file) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    }

    // Verificar permissão: somente o dono pode excluir o arquivo
    if (file.uploadedBy !== req.user.uid && !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Acesso negado para excluir este arquivo" });
    }

    // Excluir do banco de dados
    await File.deleteOne({ _id: id });

    res.json({
      message: "Arquivo excluído com sucesso do banco de dados",
      storagePath: file.storagePath, // Retornar o caminho para que o frontend possa excluir do Storage
    });
  } catch (error) {
    console.error("Erro ao excluir arquivo:", error);
    res
      .status(500)
      .json({ message: "Erro ao excluir arquivo", error: error.message });
  }
};

router.get("/", listFiles);
router.get("/:id", getFile);
router.post("/", saveFile);
router.put("/:id", updateFile);
router.delete("/:id", deleteFile);

module.exports = router;
