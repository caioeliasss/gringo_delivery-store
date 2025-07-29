const Motoboy = require("../models/Motoboy");
const geolib = require("geolib");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const axios = require("axios");
const Order = require("../models/Order");
const Travel = require("../models/Travel");

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

    this.apiBaseUrl = process.env.API_URL || "http://localhost:8080/api";
  }

  async findBestMotoboys(coordinates, maxDistance = 5000, limit = 50) {
    // Filtrando os motoboys que cancelaram a corrida ou que aceitaram e depois cancelaram
    try {
      // First find all available and approved motoboys within the max distance

      const nearbyMotoboys = await Motoboy.find({})
        .where({
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
    console.log(`🔄 [QUEUE DEBUG] Método processMotoboyQueue CHAMADO!`);
    console.log(`📋 [QUEUE DEBUG] Pedido ID: ${order._id}`);
    console.log(`🏍️ [QUEUE DEBUG] ${motoboys.length} motoboys recebidos`);

    // If no motoboys left, return failure
    if (motoboys.length === 0) {
      console.log(`❌ [QUEUE DEBUG] Nenhum motoboy na lista`);
      order.motoboy.queue.status = "cancelado";
      await order.save();
      return {
        success: false,
        message: "No available motoboys accepted the delivery",
      };
    }

    console.warn(
      "🔍 [QUEUE DEBUG] Estado atual da queue:",
      JSON.stringify(order.motoboy.queue, null, 2)
    );

    if (
      !order.motoboy.queue.motoboys ||
      order.motoboy.queue.motoboys.length === 0
    ) {
      console.log("✅ [QUEUE DEBUG] Criando nova fila de motoboys");
      order.motoboy.queue = {
        motoboys: motoboys || [],
        motoboy_status: [],
        status: "buscando",
      };
      await order.save();
      console.log("💾 [QUEUE DEBUG] Fila salva no banco");
    } else {
      console.log("🔄 [QUEUE DEBUG] Atualizando fila de motoboys existente");
      order.motoboy.queue = {
        ...order.motoboy.queue,
        status: "buscando",
      };
    }

    const motoboy = motoboys[0];
    if (order.motoboy.blacklist.includes(motoboy._id.toString())) {
      // Se o motoboy está na blacklist, tentar o próximo
      return this.processMotoboyQueue(motoboys.slice(1), order);
    }
    try {
      const accepted = await this.requestMotoboy(motoboy, order);

      if (accepted) {
        order.motoboy.queue.status = "aceito";
        // Motoboy accepted, assign to order
        order.motoboy = {
          ...order.motoboy,
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
        if (motoboys.length === 1) {
          console.warn(
            `All motoboys rejected the delivery for order ${order._id}`
          );
          order.motoboy.queue.status = "cancelado";
          await order.save();
          return {
            success: false,
            message: "All motoboys rejected the delivery",
          };
        }
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
      try {
        const response = await axios.post(`${this.apiBaseUrl}/notifications`, {
          motoboyId: motoboy._id,
          order: order,
        });
        // Enviar push/notificação ao app (simulado)
        console.log(`Notificando id: ${response.data._id}`);

        return new Promise((resolve) => {
          // 1. Monitorar mudanças na notificação
          const notificationId =
            typeof response.data._id === "string"
              ? new mongoose.Types.ObjectId(response.data._id)
              : response.data._id;

          // Use a more reliable match pattern
          const changeStream = Notification.watch([
            {
              $match: {
                operationType: { $in: ["update", "replace"] },
                "documentKey._id": notificationId,
              },
            },
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
                  race: {
                    orderId: order._id,
                    active: true,
                  },
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
              response.data._id
            );
            if (notificacaoAtual && notificacaoAtual.status === "PENDING") {
              notificacaoAtual.status = "EXPIRED";
              await notificacaoAtual.save();
            }

            resolve(false);
          }, 60000); // 30 segundos
        });
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      console.error("Erro ao solicitar motoboy:", error);
      return false;
    }
  }

  async removeMotoboyFromOrder(orderId, motoboyId) {
    try {
      const motoboy = await Motoboy.findById(motoboyId);
      if (!motoboy) {
        console.log(`Motoboy ${motoboyId} não encontrado`);
        return;
      }

      const travel = await Travel.findById(motoboy.race?.travelId);
      if (travel) {
        // Cancel the travel if it exists
        await travel.updateOne({ status: "cancelado" });
      }

      // Reset motoboy race data
      motoboy.race = {
        active: false,
        orderId: null,
        travelId: null,
      };
      motoboy.isAvailable = true; // Tornar disponível novamente
      await motoboy.save();

      const order = await Order.findById(orderId);
      if (!order) {
        console.log(`Pedido ${orderId} não encontrado`);
        return;
      }

      // Verificar se blacklist existe, senão criar
      if (!order.motoboy.blacklist) {
        order.motoboy.blacklist = [];
      }

      // Adicionar à blacklist se não estiver já
      if (!order.motoboy.blacklist.includes(motoboyId.toString())) {
        order.motoboy.blacklist.push(motoboyId.toString());
      }

      // Reset motoboy data in order
      order.motoboy.motoboyId = null;
      order.motoboy.name = "";
      order.motoboy.phone = null;
      order.motoboy.rated = false;

      order.motoboy.queue = {
        ...order.motoboy.queue,
        status: "cancelado",
      };

      await order.save();

      return order;
    } catch (error) {
      console.error("❌ Erro ao remover motoboy:", error);
      return { error: error.message };
    }
  }
}

module.exports = new MotoboyService();
