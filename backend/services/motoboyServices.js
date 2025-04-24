const Motoboy = require("../models/Motoboy");
const geolib = require("geolib");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

/**
 * Service for handling motoboy operations
 */
class MotoboyService {
  /**
   * Find the best available motoboys for a delivery
   * Ordered by: isAvailable (true first), score (highest first), and distance (closest first)
   *
   *
   * @param {Array} coordinates - [longitude, latitude] of the delivery destination
   * @param {Number} maxDistance - Maximum distance in meters to search for motoboys
   * @param {Number} limit - Maximum number of motoboys to return
   * @returns {Promise<Array>} - Array of motoboys ordered by availability, score and distance
   */
  constructor() {
    // Queue for tracking motoboy requests in progress
    this.requestQueue = new Map();
    // Map to track which orders are being processed
    this.processingOrders = new Map();
  }

  async findBestMotoboys(coordinates, maxDistance = 5000, limit = 10) {
    try {
      // First find all available and approved motoboys within the max distance
      const nearbyMotoboys = await Motoboy.find({
        isApproved: true,
        isAvailable: true,
      })
        .sort({ score: -1 }) // First sort by availability and score
        .limit(parseInt(limit))
        .select(
          "name phoneNumber coordinates score profileImage isAvailable lastActive"
        );

      //   console.log(nearbyMotoboys.length);

      if (!nearbyMotoboys || nearbyMotoboys.length === 0) {
        return [];
      }

      // Calculate exact distance for each motoboy using geolib
      const motoboyWithDistance = nearbyMotoboys.map((motoboy) => {
        const distanceMeters = geolib.getDistance(
          {
            latitude: coordinates[1],
            longitude: coordinates[0],
          },
          {
            latitude: motoboy.coordinates[1],
            longitude: motoboy.coordinates[0],
          }
        );
        return {
          _id: motoboy._id,
          name: motoboy.name,
          phoneNumber: motoboy.phoneNumber,
          score: motoboy.score,
          profileImage: motoboy.profileImage,
          isAvailable: motoboy.isAvailable,
          lastActive: motoboy.lastActive,
          distance: distanceMeters,
          estimatedTimeMinutes: this.estimateTravelTime(distanceMeters),
        };
      });

      // Final sorting - first by availability, then by score (for same availability), then by distance
      return motoboyWithDistance.sort((a, b) => {
        // First priority: availability
        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1;
        }

        // Second priority: score (higher is better)
        if (a.score !== b.score) {
          return b.score - a.score;
        }

        // Third priority: distance (shorter is better)
        return a.distance - b.distance;
      });
    } catch (error) {
      console.error("Error finding best motoboys:", error);
      throw error;
    }
  }

  /**
   * Estimate travel time based on distance
   * @param {Number} distance - Distance in meters
   * @param {Number} speed - Average speed in km/h (default: 20 km/h)
   * @returns {Number} - Estimated travel time in minutes
   */
  estimateTravelTime(distance, speed = 20) {
    // Convert speed from km/h to m/min
    const speedInMetersPerMinute = (speed * 1000) / 60;
    return Math.ceil(distance / speedInMetersPerMinute);
  }
  /**
   * Process motoboys in queue until one accepts the delivery or we run out of options
   *
   * @param {Array} motoboys - Array of motoboys sorted by preference
   * @param {Object} order - The order to assign
   * @returns {Promise<Object>} - Result of the assignment attempt
   */
  async processMotoboyQueue(motoboys, order) {
    // If no motoboys left, return failure
    if (motoboys.length === 0) {
      return {
        success: false,
        message: "No available motoboys accepted the delivery",
      };
    }

    const motoboy = motoboys[0];
    try {
      const accepted = await this.requestMotoboy(motoboy, order);

      if (accepted) {
        // Motoboy accepted, assign to order
        order.motoboy = {
          motoboyId: motoboy._id,
          name: motoboy.name,
          phone: motoboy.phoneNumber,
          location: {
            estimatedTime: motoboy.estimatedTimeMinutes,
            distance: motoboy.distance,
            startTime: new Date(),
          },
        };

        // Save the updated order
        await order.save();

        return {
          success: true,
          order,
          motoboy,
        };
      } else {
        // This motoboy rejected, try the next one
        return this.processMotoboyQueue(motoboys.slice(1), order);
      }
    } catch (error) {
      // Remove from request queue if there was an error
      // this.requestQueue.delete(motoboy._id.toString());

      // Try next motoboy
      return this.processMotoboyQueue(motoboys.slice(1), order);
    }
  }

  /**
   * Request a motoboy to take a delivery
   * In a real system, this would send a notification to the motoboy's device
   * and wait for their response with a timeout
   *
   * @param {Object} motoboy - The motoboy to request
   * @param {Object} order - The order to deliver
   * @returns {Promise<boolean>} - Whether the motoboy accepted
   */
  async requestMotoboy(motoboy, order) {
    try {
      // Verificar disponibilidade
      const motoboyAtual = await Motoboy.findById(motoboy._id).select(
        "isAvailable"
      );
      if (!motoboyAtual || !motoboyAtual.isAvailable) {
        return false;
      }

      // Criar notificação
      const notification = new Notification({
        motoboyId: motoboy._id,
        type: "DELIVERY_REQUEST",
        title: `${order.store.name}`,
        message: `Pedido #${order.orderNumber}`,
        data: {
          storeAddress: order.store.address,
          order: order,
          orderId: order._id,
          customerName: order.customer.name,
          address: order.customer.customerAddress,
        },
        status: "PENDING",
        expiresAt: new Date(Date.now() + 60000),
      });

      await notification.save();

      // Enviar push/notificação ao app (simulado)
      console.log(
        `Notificando motoboy ${motoboy.name} para pedido ${order.orderNumber}`
      );

      // Aguardar resposta com Change Stream
      return new Promise((resolve) => {
        // 1. Monitorar mudanças na notificação
        const changeStream = Notification.watch([
          { $match: { "documentKey._id": notification._id } },
        ]);

        // 2. Quando houver mudança
        changeStream.on("change", async (change) => {
          let novoStatus;

          // Extrair o novo status
          if (
            change.operationType === "update" &&
            change.updateDescription.updatedFields.status
          ) {
            novoStatus = change.updateDescription.updatedFields.status;
          } else if (change.operationType === "replace") {
            novoStatus = change.fullDocument.status;
          }

          // Se status mudou e não é mais PENDING
          if (novoStatus && novoStatus !== "PENDING") {
            // Fechar monitoramento
            changeStream.close();

            const aceito = novoStatus === "ACCEPTED";

            // Se aceitou, atualizar motoboy como indisponível
            if (aceito) {
              await Motoboy.findByIdAndUpdate(motoboy._id, {
                isAvailable: false,
                currentOrderId: order._id,
              });
            }

            resolve(aceito);
          }
        });

        // 3. Timeout para caso não haja resposta
        const timeout = setTimeout(async () => {
          changeStream.close();

          // Verificar se notificação ainda está pendente
          const notificacaoAtual = await Notification.findById(
            notification._id
          );
          if (notificacaoAtual && notificacaoAtual.status === "PENDING") {
            notificacaoAtual.status = "PENDING"; //FIXME
            await notificacaoAtual.save();
          }

          resolve(false);
        }, 30000); // 30 segundos
      });
    } catch (error) {
      console.error("Erro ao solicitar motoboy:", error);
      return false;
    }
  }

  // Método para processar fila de motoboys (simplificado)
  async processMotoboyQueue(motoboys, order) {
    if (motoboys.length === 0) {
      return { success: false };
    }

    const motoboy = motoboys[0];
    const aceito = await this.requestMotoboy(motoboy, order);

    if (aceito) {
      // Atribuir motoboy ao pedido
      order.motoboy = {
        motoboyId: motoboy._id,
        name: motoboy.name,
        phone: motoboy.phoneNumber,
      };
      order.status = "em_preparo";
      await order.save();
      return { success: true, order, motoboy };
    } else {
      // Tentar próximo motoboy
      return this.processMotoboyQueue(motoboys.slice(1), order);
    }
  }
}

module.exports = new MotoboyService();
