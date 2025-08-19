const Motoboy = require("../models/Motoboy");
const geolib = require("geolib");
const Order = require("../models/Order");
const Travel = require("../models/Travel");
const NotificationService = require("./notificationService");
const notificationService = require("./notificationService");
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
    // Map to store active timers for cancellation
    this.activeTimers = new Map();

    // Limpeza periódica de requests expirados a cada 30 segundos
    setInterval(() => {
      this.cleanExpiredRequests();
    }, 30000);
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
          "name phoneNumber coordinates score profileImage isAvailable lastActive firebaseUid"
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
          firebaseUid: motoboy.firebaseUid,
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
    // Verificar se o pedido já foi aceito por algum motoboy
    const currentOrder = await Order.findById(order._id).select("motoboy");
    if (
      currentOrder &&
      currentOrder.motoboy &&
      currentOrder.motoboy.motoboyId &&
      currentOrder.motoboy.queue &&
      currentOrder.motoboy.queue.status === "confirmado"
    ) {
      console.log(
        `✅ Pedido ${order._id} já foi aceito pelo motoboy ${currentOrder.motoboy.motoboyId}`
      );
      return {
        success: true,
        order: currentOrder,
        message: "Order already accepted by another motoboy",
      };
    }

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

    if (
      !order.motoboy.queue.motoboys ||
      order.motoboy.queue.motoboys.length === 0
    ) {
      order.motoboy.queue = {
        motoboys: motoboys || [],
        motoboy_status: [],
        status: "buscando",
      };
      await order.save();
    } else {
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
      // Verificar novamente se o pedido já foi aceito antes de fazer request
      const checkOrder = await Order.findById(order._id).select("motoboy");
      if (
        checkOrder &&
        checkOrder.motoboy &&
        checkOrder.motoboy.motoboyId &&
        checkOrder.motoboy.queue &&
        checkOrder.motoboy.queue.status === "confirmado"
      ) {
        console.log(
          `✅ Pedido ${order._id} já foi aceito durante o processamento`
        );
        return {
          success: true,
          order: checkOrder,
          message: "Order was accepted while processing queue",
        };
      }

      order.motoboy.timer = Date.now();

      const accepted = await this.requestMotoboy(motoboy, order);

      if (accepted) {
        order.motoboy.queue.status = "confirmado";
        // Motoboy accepted, assign to order
        order.motoboy = {
          ...order.motoboy,
          motoboyId: motoboy._id,
          name: motoboy.name,
          phone: motoboy.phoneNumber,
          phoneNumber: motoboy.phoneNumber,
          timer: Date.now(),
          location: {
            estimatedTime: motoboy.estimatedTimeMinutes,
            distance: motoboy.distance,
            startTime: new Date(),
          },
        };

        // Save the updated order
        await order.save();

        console.log(
          `🔄 Motoboy ${motoboy.name} atribuído ao pedido ${order._id}, iniciando timer...`
        );

        // Iniciar timer de 15 minutos para verificar se o motoboy chegou
        this.timerCounting(order._id);

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
   * Request a motoboy to take a delivery using WebSocket method
   * Waits for acceptOrder:success socket event from the motoboy
   *
   * @param {Object} motoboy - The motoboy to request
   * @param {Object} order - The order to deliver
   * @returns {Promise<boolean>} - Whether the motoboy accepted
   */
  async requestMotoboy(motoboy, order) {
    try {
      // Verificar disponibilidade do motoboy
      const motoboyAtual = await Motoboy.findById(motoboy._id).select(
        "isAvailable firebaseUid name phoneNumber fcmToken"
      );
      if (!motoboyAtual || !motoboyAtual.isAvailable) {
        console.log(`❌ Motoboy ${motoboy.name} não está disponível`);
        return false;
      }

      if (motoboy._id) {
        console.log(
          `📱 Enviando oferta de entrega para ${motoboy.name} via WebSocket`
        );
        notificationService.createDeliveryRequestNotification({
          motoboyId: motoboy._id.toString(),
          order: order,
        });
      }

      try {
        // Aguardar aceitação via WebSocket
        return new Promise((resolve) => {
          const orderId = order._id.toString();
          const motoboyId = motoboy._id.toString();
          const timeout = 60000; // 60 segundos timeout

          console.log(
            `� Aguardando aceitação via WebSocket para pedido ${orderId} e motoboy ${motoboy.name}`
          );

          // Criar chave única para este request
          const requestKey = `${orderId}-${motoboyId}`;

          // Armazenar o resolver na queue para ser chamado quando o socket receber acceptOrder:success
          this.requestQueue.set(requestKey, {
            resolve,
            orderId,
            motoboyId,
            motoboyName: motoboy.name,
            timestamp: Date.now(),
          });

          // Timeout para casos onde o motoboy não responde
          const timeoutId = setTimeout(() => {
            if (this.requestQueue.has(requestKey)) {
              console.log(
                `⏰ Timeout atingido para motoboy ${motoboy.name} no pedido ${orderId}`
              );
              this.requestQueue.delete(requestKey);
              resolve(false);
            }
          }, timeout);

          // Armazenar o timeout ID para limpeza
          this.requestQueue.get(requestKey).timeoutId = timeoutId;
        });
      } catch (error) {
        console.error(`❌ Erro ao enviar oferta para ${motoboy.name}:`, error);
        return false;
      }
    } catch (error) {
      console.error("❌ Erro ao solicitar motoboy:", error);
      return false;
    }
  }

  /**
   * Processa aceitação de pedido via WebSocket
   * Chamado quando recebe evento acceptOrder:success
   *
   * @param {String} orderId - ID do pedido
   * @param {String} motoboyId - ID do motoboy que aceitou
   */
  handleOrderAcceptance(orderId, motoboyId) {
    console.log(
      `✅ [SOCKET] Recebido acceptOrder:success - Pedido: ${orderId}, Motoboy: ${motoboyId}`
    );

    // Buscar request pendente na queue
    const requestKey = `${orderId}-${motoboyId}`;
    const pendingRequest = this.requestQueue.get(requestKey);

    if (pendingRequest) {
      console.log(
        `🎯 [SOCKET] Encontrado request pendente para ${pendingRequest.motoboyName}`
      );

      // Limpar timeout
      if (pendingRequest.timeoutId) {
        clearTimeout(pendingRequest.timeoutId);
      }

      // Remover da queue
      this.requestQueue.delete(requestKey);

      // Resolver a Promise com sucesso
      pendingRequest.resolve(true);

      console.log(
        `✅ [SOCKET] Aceitação processada com sucesso para pedido ${orderId}`
      );
    } else {
      console.log(
        `❌ [SOCKET] Nenhum request pendente encontrado para chave ${requestKey}`
      );

      // Listar todas as chaves pendentes para debug
      const pendingKeys = Array.from(this.requestQueue.keys());
      console.log(`🔍 [SOCKET DEBUG] Requests pendentes:`, pendingKeys);
    }
  }

  /**
   * Limpa requests expirados da queue
   * Útil para evitar memory leaks
   */
  cleanExpiredRequests() {
    const now = Date.now();
    const maxAge = 120000; // 2 minutos

    for (const [key, request] of this.requestQueue.entries()) {
      if (now - request.timestamp > maxAge) {
        console.log(`🧹 Limpando request expirado: ${key}`);

        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }

        this.requestQueue.delete(key);

        // Resolver com false para não travar o processamento
        request.resolve(false);
      }
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
        // Cancel the travel if it exists - usando findByIdAndUpdate para garantir que o middleware seja executado
        await Travel.findByIdAndUpdate(travel._id, {
          status: "cancelado",
          "finance.status": "cancelado", // Garantir que o status financeiro seja cancelado
        });
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
      order.motoboy.hasArrived = false;

      order.motoboy.queue = {
        ...order.motoboy.queue,
        status: "cancelado",
      };

      await order.save();

      console.log(
        `🔔 [DEBUG] Enviando notificação DeAssignedMotoboy para firebaseUid: ${motoboy.firebaseUid}`
      );
      const notificationSent = global.sendSocketNotification(
        motoboy.firebaseUid,
        "DeAssignedMotoboy",
        order
      );

      if (motoboy.fcmToken) {
        NotificationService.createGenericNotification({
          motoboyId: motoboy._id,
          token: motoboy.fcmToken,
          title: "Removido do pedido",
          message: `Você foi removido do pedido ${order.orderNumber}.`,
          data: {
            orderId: order._id,
            travelId: travel._id,
            type: "SYSTEM",
            screen: "/(tabs)",
          },
        });
      } else {
        console.warn("Motoboy não possui token FCM");
      }

      return order;
    } catch (error) {
      console.error("❌ Erro ao remover motoboy:", error);
      return { error: error.message };
    }
  }

  timerCounting(orderId) {
    try {
      console.log(`🕐 Iniciando timer de 15 minutos para pedido ${orderId}`);

      // Cancelar timer existente se houver
      this.clearTimer(orderId);

      const timer = setTimeout(async () => {
        try {
          console.log(`⏰ Timer expirado! Verificando pedido ${orderId}`);

          const order = await Order.findById(orderId);

          if (!order) {
            console.log(`❌ Pedido ${orderId} não encontrado`);
            this.activeTimers.delete(orderId);
            return;
          }

          if (!order.motoboy || !order.motoboy.motoboyId) {
            console.log(`❌ Pedido ${orderId} não tem motoboy atribuído`);
            this.activeTimers.delete(orderId);
            return;
          }

          // Verificar se o motoboy ainda não chegou
          if (!order.motoboy.hasArrived) {
            console.log(
              `🚫 Motoboy ${order.motoboy.motoboyId} não chegou a tempo no pedido ${orderId}. Removendo...`
            );

            await this.removeMotoboyFromOrder(orderId, order.motoboy.motoboyId);

            console.log(
              `✅ Motoboy removido automaticamente do pedido ${orderId}`
            );

            setImmediate(async () => {
              try {
                const motoboys = await this.findBestMotoboys(
                  order.store.address.coordinates || order.store.coordinates
                );

                await this.processMotoboyQueue(motoboys, order);
              } catch (error) {
                console.error(
                  `❌ Erro ao tentar reatribuir motoboy: ${error.message}`
                );
              }
            });
          } else {
            console.log(`✅ Motoboy já chegou no pedido ${orderId}`);
          }

          // Remover timer da lista ativa
          this.activeTimers.delete(orderId);
        } catch (error) {
          console.error(
            `❌ Erro ao processar timer para pedido ${orderId}:`,
            error
          );
          this.activeTimers.delete(orderId);
        }
      }, 900000); // 15 minutos em millisegundos

      // Armazenar o timer para possível cancelamento
      this.activeTimers.set(orderId, {
        timer,
        startTime: Date.now(),
        orderId,
      });

      console.log(`✅ Timer configurado para pedido ${orderId}`);
      return { timerStarted: true, orderId };
    } catch (error) {
      console.error("Erro ao iniciar contagem do timer:", error);
      return { error: error.message };
    }
  }

  /**
   * Cancela o timer ativo para um pedido
   * @param {String} orderId - ID do pedido
   */
  clearTimer(orderId) {
    const timerData = this.activeTimers.get(orderId);

    if (timerData) {
      clearTimeout(timerData.timer);
      this.activeTimers.delete(orderId);
      console.log(`🗑️ Timer cancelado para pedido ${orderId}`);
      return true;
    }

    return false;
  }

  /**
   * Marca motoboy como chegado e cancela o timer
   * @param {String} orderId - ID do pedido
   */
  markMotoboyAsArrived(orderId) {
    console.log(`📍 Motoboy chegou no pedido ${orderId}, cancelando timer`);
    return this.clearTimer(orderId);
  }

  /**
   * Lista todos os timers ativos
   */
  getActiveTimers() {
    const timers = [];
    for (const [orderId, timerData] of this.activeTimers.entries()) {
      const elapsed = Date.now() - timerData.startTime;
      const remaining = 900000 - elapsed; // 15 min - tempo decorrido

      timers.push({
        orderId,
        startTime: new Date(timerData.startTime),
        elapsedMs: elapsed,
        remainingMs: Math.max(0, remaining),
        remainingMinutes: Math.max(0, Math.ceil(remaining / 60000)),
      });
    }
    return timers;
  }
}

module.exports = new MotoboyService();
