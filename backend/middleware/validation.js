// backend/middleware/validation.js
const mongoose = require("mongoose");

/**
 * Middleware para validar ObjectIds nos parâmetros da rota
 * @param {string[]} paramNames - Nomes dos parâmetros que devem ser ObjectIds válidos
 */
const validateObjectIds = (paramNames) => {
  return (req, res, next) => {
    const errors = [];

    for (const paramName of paramNames) {
      const paramValue = req.params[paramName];

      // Verificar se o parâmetro existe
      if (!paramValue) {
        errors.push({
          param: paramName,
          value: paramValue,
          message: `${paramName} é obrigatório`,
        });
        continue;
      }

      // Verificar se o valor não é 'undefined' (string)
      if (paramValue === "undefined" || paramValue === "null") {
        errors.push({
          param: paramName,
          value: paramValue,
          message: `${paramName} não pode ser '${paramValue}'`,
        });
        continue;
      }

      // Verificar se é um ObjectId válido
      if (!mongoose.Types.ObjectId.isValid(paramValue)) {
        errors.push({
          param: paramName,
          value: paramValue,
          message: `${paramName} deve ser um ObjectId válido`,
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Parâmetros inválidos",
        details: errors,
      });
    }

    next();
  };
};

/**
 * Middleware específico para validar withdrawalId
 */
const validateWithdrawalId = validateObjectIds(["withdrawalId"]);

/**
 * Middleware específico para validar motoboyId
 */
const validateMotoboyId = validateObjectIds(["motoboyId"]);

/**
 * Middleware específico para validar tanto withdrawalId quanto motoboyId
 */
const validateBothIds = validateObjectIds(["withdrawalId", "motoboyId"]);

module.exports = {
  validateObjectIds,
  validateWithdrawalId,
  validateMotoboyId,
  validateBothIds,
};
