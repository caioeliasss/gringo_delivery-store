// backend/socket/socketHandler.js
const Motoboy = require("../models/Motoboy");

module.exports = (io) => {
  io.on("connection", (socket) => {
    const motoboyId = socket.handshake.query.motoboyId;
    // console.log(`Motoboy conectado: ${motoboyId}, Socket ID: ${socket.id}`);

    // Juntar o motoboy a uma sala específica
    if (motoboyId) {
      socket.join(`motoboy:${motoboyId}`);
    }

    // Receber atualização de localização
    socket.on("updateLocation", async (locationData) => {
      try {
        // console.log(`Localização recebida de ${motoboyId}:`, locationData);

        // Validar dados recebidos
        if (!locationData.latitude || !locationData.longitude) {
          throw new Error("Dados de localização inválidos");
        }

        // Atualizar no banco de dados
        const updatedMotoboy = await Motoboy.findByIdAndUpdate(
          motoboyId,
          {
            coordinates: [locationData.longitude, locationData.latitude],
            lastLocationUpdate: new Date(),
            // Se você quiser armazenar mais informações
            currentLocation: {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              accuracy: locationData.accuracy,
              timestamp: locationData.timestamp || new Date().toISOString(),
            },
          },
          { new: true } // Retorna o documento atualizado
        );

        if (!updatedMotoboy) {
          throw new Error("Motoboy não encontrado");
        }

        // Emitir para outros clientes interessados (dashboard admin, cliente, etc)
        io.emit("motoboyLocationUpdate", {
          motoboyId,
          location: locationData,
          timestamp: new Date().toISOString(),
        });

        // Confirmar recebimento
        socket.emit("locationUpdate:success", {
          status: "success",
          message: "Localização atualizada com sucesso",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Erro ao atualizar localização:", error);
        socket.emit("locationUpdate:error", {
          status: "error",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Lidar com eventos de pedidos
    socket.on("orderStatusUpdate", async (data) => {
      try {
        console.log("Atualização de status do pedido:", data);

        // Emitir para outros interessados
        io.emit("orderUpdate", {
          orderId: data.orderId,
          status: data.status,
          motoboyId: motoboyId,
          timestamp: new Date().toISOString(),
        });

        socket.emit("orderUpdate:success", {
          status: "success",
          message: "Status do pedido atualizado",
        });
      } catch (error) {
        console.error("Erro ao atualizar status do pedido:", error);
        socket.emit("orderUpdate:error", {
          status: "error",
          message: error.message,
        });
      }
    });

    // Desconexão
    socket.on("disconnect", () => {
      console.log(
        `Motoboy desconectado: ${motoboyId}, Socket ID: ${socket.id}`
      );

      // Opcional: Atualizar status do motoboy para offline
      if (motoboyId) {
        Motoboy.findByIdAndUpdate(motoboyId, {
          isOnline: false,
          lastSeen: new Date(),
        }).catch((err) =>
          console.error("Erro ao atualizar status offline:", err)
        );
      }
    });
  });
};
