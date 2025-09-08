const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const SupportTeam = require("../models/SupportTeam");

const createSupportTeam = async (req, res) => {
  const { name, email, phone, whatsapp, firebaseUid, status, active, role } =
    req.body;

  try {
    // Validações básicas
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nome é obrigatório",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email é obrigatório",
      });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Formato de email inválido",
      });
    }

    // Validar roles se fornecidas
    const validRoles = ["admin", "general", "finances", "logistics"];
    if (role && Array.isArray(role)) {
      const invalidRoles = role.filter((r) => !validRoles.includes(r));
      if (invalidRoles.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Roles inválidas: ${invalidRoles.join(
            ", "
          )}. Roles válidas: ${validRoles.join(", ")}`,
        });
      }
    }

    // Verificar se email já está em uso
    const existingEmail = await SupportTeam.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email já está sendo usado por outro membro",
      });
    }

    // Verificar se firebaseUid já está em uso (se fornecido)
    if (firebaseUid) {
      const existingFirebaseUid = await SupportTeam.findOne({ firebaseUid });
      if (existingFirebaseUid) {
        return res.status(409).json({
          success: false,
          message: "Firebase UID já está sendo usado",
        });
      }
    }

    const supportTeam = new SupportTeam({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || "",
      whatsapp: whatsapp?.trim() || "",
      firebaseUid: firebaseUid || "",
      status: status || "offline",
      active: false,
      role: role || [],
    });

    await supportTeam.save();

    console.log(
      `✅ Novo membro da equipe criado: ${supportTeam.name} (${
        supportTeam.email
      }) - Roles: ${supportTeam.role.join(", ")}`
    );

    res.status(201).json({
      success: true,
      message: "Membro da equipe criado com sucesso",
      data: supportTeam,
    });
  } catch (error) {
    console.error("❌ Erro ao criar membro da equipe:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        details: Object.values(error.errors).map((e) => e.message),
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email ou Firebase UID já está em uso",
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error:
        process.env.NODE_ENV === "development" ? error.message : "Erro interno",
    });
  }
};
const updateSupportTeam = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, whatsapp, status, active, role } = req.body;

  try {
    // Validações básicas
    if (!name || !email) {
      return res.status(400).json({
        message: "Nome e email são obrigatórios",
      });
    }

    // Validar roles se fornecidas
    const validRoles = ["admin", "general", "finances", "logistics"];
    if (role && Array.isArray(role)) {
      const invalidRoles = role.filter((r) => !validRoles.includes(r));
      if (invalidRoles.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Roles inválidas: ${invalidRoles.join(
            ", "
          )}. Roles válidas: ${validRoles.join(", ")}`,
        });
      }
    }

    // Verificar se o email já está em uso por outro membro (se foi alterado)
    const existingSupport = await SupportTeam.findById(id);
    if (!existingSupport) {
      return res.status(404).json({
        message: "Membro da equipe não encontrado",
      });
    }

    // Se o email foi alterado, verificar se não está em uso
    if (email !== existingSupport.email) {
      const emailInUse = await SupportTeam.findOne({
        email: email,
        _id: { $ne: id },
      });

      if (emailInUse) {
        return res.status(409).json({
          message: "Email já está sendo usado por outro membro",
        });
      }
    }

    const supportTeam = await SupportTeam.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || "",
        whatsapp: whatsapp?.trim() || "",
        status: status || "offline",
        active: active !== undefined ? active : existingSupport.active,
        role: role !== undefined ? role : existingSupport.role,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    console.log(
      `✅ Membro da equipe atualizado: ${supportTeam.name} (${
        supportTeam.email
      }) - Roles: ${supportTeam.role.join(", ")}`
    );

    res.json({
      success: true,
      message: "Membro da equipe atualizado com sucesso",
      data: supportTeam,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar membro da equipe:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Dados inválidos",
        details: Object.values(error.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
};
const getSupportTeam = async (req, res) => {
  try {
    const supportTeam = await SupportTeam.find();
    res.json(supportTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getSupportTeamById = async (req, res) => {
  const { id } = req.params;
  try {
    const supportTeam = await SupportTeam.findById(id);
    res.json(supportTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSupportTeamByFirebaseUid = async (req, res) => {
  const { firebaseUid } = req.params;
  try {
    const firebaseUidTrimmed = firebaseUid.trim();
    const supportTeam = await SupportTeam.findOne({
      firebaseUid: firebaseUidTrimmed,
    });
    if (!supportTeam) {
      return res.status(404).json({ message: "Support team not found" });
    }

    res.json(supportTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSupportTeamByEmail = async (req, res) => {
  const { email } = req.params;
  try {
    const supportTeam = await SupportTeam.findOne({ email: email });
    res.json(supportTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSupportTeam = async (req, res) => {
  const { id } = req.params;

  try {
    const supportTeam = await SupportTeam.findById(id);

    if (!supportTeam) {
      return res.status(404).json({
        success: false,
        message: "Membro da equipe não encontrado",
      });
    }

    // Realizar soft delete ou hard delete baseado na necessidade
    await SupportTeam.findByIdAndDelete(id);

    console.log(
      `🗑️ Membro da equipe removido: ${supportTeam.name} (${supportTeam.email})`
    );

    res.json({
      success: true,
      message: "Membro da equipe removido com sucesso",
      data: supportTeam,
    });
  } catch (error) {
    console.error("❌ Erro ao remover membro da equipe:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "ID inválido",
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
};

// Rota específica para edição de suporte com validações avançadas
const editSupportTeam = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    console.log(`🔧 Editando membro da equipe ID: ${id}`, updateData);

    // Verificar se o membro existe
    const existingSupport = await SupportTeam.findById(id);
    if (!existingSupport) {
      return res.status(404).json({
        success: false,
        message: "Membro da equipe não encontrado",
      });
    }

    // Preparar dados para atualização
    const fieldsToUpdate = {};

    if (updateData.name !== undefined) {
      if (!updateData.name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Nome não pode estar vazio",
        });
      }
      fieldsToUpdate.name = updateData.name.trim();
    }

    if (updateData.email !== undefined) {
      const email = updateData.email.trim().toLowerCase();
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email não pode estar vazio",
        });
      }

      // Verificar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Formato de email inválido",
        });
      }

      // Verificar se email já está em uso
      if (email !== existingSupport.email) {
        const emailInUse = await SupportTeam.findOne({
          email: email,
          _id: { $ne: id },
        });

        if (emailInUse) {
          return res.status(409).json({
            success: false,
            message: "Email já está sendo usado por outro membro",
          });
        }
      }

      fieldsToUpdate.email = email;
    }

    if (updateData.phone !== undefined) {
      fieldsToUpdate.phone = updateData.phone.trim();
    }

    if (updateData.whatsapp !== undefined) {
      fieldsToUpdate.whatsapp = updateData.whatsapp.trim();
    }

    if (updateData.status !== undefined) {
      const validStatuses = ["online", "offline", "busy", "away"];
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({
          success: false,
          message: "Status inválido. Use: online, offline, busy ou away",
        });
      }
      fieldsToUpdate.status = updateData.status;
    }

    if (updateData.active !== undefined) {
      fieldsToUpdate.active = Boolean(updateData.active);
    }

    // Validar e atualizar roles
    if (updateData.role !== undefined) {
      const validRoles = ["admin", "general", "finances", "logistics"];

      if (!Array.isArray(updateData.role)) {
        return res.status(400).json({
          success: false,
          message: "Roles deve ser um array",
        });
      }

      const invalidRoles = updateData.role.filter(
        (r) => !validRoles.includes(r)
      );
      if (invalidRoles.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Roles inválidas: ${invalidRoles.join(
            ", "
          )}. Roles válidas: ${validRoles.join(", ")}`,
        });
      }

      fieldsToUpdate.role = updateData.role;
    }

    // Adicionar timestamp de atualização
    fieldsToUpdate.updatedAt = new Date();

    // Atualizar o membro
    const updatedSupport = await SupportTeam.findByIdAndUpdate(
      id,
      { $set: fieldsToUpdate },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    );

    console.log(
      `✅ Membro da equipe editado com sucesso: ${
        updatedSupport.name
      } - Roles: ${updatedSupport.role.join(", ")}`
    );

    res.json({
      success: true,
      message: "Membro da equipe editado com sucesso",
      data: updatedSupport,
      updatedFields: Object.keys(fieldsToUpdate),
    });
  } catch (error) {
    console.error("❌ Erro ao editar membro da equipe:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        details: Object.values(error.errors).map((e) => e.message),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "ID inválido",
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error:
        process.env.NODE_ENV === "development" ? error.message : "Erro interno",
    });
  }
};

// Rota para alternar status ativo/inativo
const toggleSupportActive = async (req, res) => {
  const { id } = req.params;

  try {
    const existingSupport = await SupportTeam.findById(id);
    if (!existingSupport) {
      return res.status(404).json({
        success: false,
        message: "Membro da equipe não encontrado",
      });
    }

    const updatedSupport = await SupportTeam.findByIdAndUpdate(
      id,
      {
        active: !existingSupport.active,
        updatedAt: new Date(),
      },
      { new: true }
    );

    console.log(
      `🔄 Status ativo alterado: ${updatedSupport.name} - ${
        updatedSupport.active ? "Ativo" : "Inativo"
      }`
    );

    res.json({
      success: true,
      message: `Membro ${
        updatedSupport.active ? "ativado" : "desativado"
      } com sucesso`,
      data: updatedSupport,
    });
  } catch (error) {
    console.error("❌ Erro ao alterar status ativo:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
};

// Rota para atualizar apenas as roles de um membro
const updateSupportRoles = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    console.log(`🔧 Atualizando roles do membro ID: ${id}`, { role });

    // Verificar se o membro existe
    const existingSupport = await SupportTeam.findById(id);
    if (!existingSupport) {
      return res.status(404).json({
        success: false,
        message: "Membro da equipe não encontrado",
      });
    }

    // Validar roles
    const validRoles = ["admin", "general", "finances", "logistics"];

    if (!Array.isArray(role)) {
      return res.status(400).json({
        success: false,
        message: "Roles deve ser um array",
      });
    }

    const invalidRoles = role.filter((r) => !validRoles.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Roles inválidas: ${invalidRoles.join(
          ", "
        )}. Roles válidas: ${validRoles.join(", ")}`,
      });
    }

    // Atualizar apenas as roles
    const updatedSupport = await SupportTeam.findByIdAndUpdate(
      id,
      {
        role: role,
        updatedAt: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    console.log(
      `✅ Roles atualizadas: ${
        updatedSupport.name
      } - Novas roles: ${updatedSupport.role.join(", ")}`
    );

    res.json({
      success: true,
      message: "Roles atualizadas com sucesso",
      data: updatedSupport,
      previousRoles: existingSupport.role,
      newRoles: updatedSupport.role,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar roles:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        details: Object.values(error.errors).map((e) => e.message),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "ID inválido",
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error:
        process.env.NODE_ENV === "development" ? error.message : "Erro interno",
    });
  }
};

router.post("/", createSupportTeam);
router.put("/:id", updateSupportTeam);
router.patch("/:id/edit", editSupportTeam); // Rota específica para edição
router.patch("/:id/roles", updateSupportRoles); // Rota para atualizar roles
router.patch("/:id/toggle-active", toggleSupportActive); // Rota para alternar status ativo
router.get("/", getSupportTeam);
router.get("/:id", getSupportTeamById);
router.get("/email/:email", getSupportTeamByEmail);
router.get("/firebase/:firebaseUid", getSupportTeamByFirebaseUid);
router.delete("/:id", deleteSupportTeam);

module.exports = router;
