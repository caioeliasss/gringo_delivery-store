const Occurrence = require("../models/Occurrence");

class OccurrenceService {
  async createOccurrence(data) {
    try {
      // Verificar campos obrigatórios

      // Criar a ocorrência
      const occurrence = new Occurrence({
        orderId: data.orderId || null, // Pode ser nulo se não houver
        storeId: data.storeId,
        type: data.type,
        amount: data.amount,
        description: data.description || "",
        firebaseUid: data.firebaseUid || null, // Pode ser nulo se não houver
        date: data.date || new Date(),
      });

      const savedOccurrence = await occurrence.save();
      return savedOccurrence;
    } catch (error) {
      console.error("Erro ao criar ocorrência:", error.message);
      throw error;
    }
  }
}

module.exports = new OccurrenceService();
