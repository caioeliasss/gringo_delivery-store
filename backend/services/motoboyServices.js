const Motoboy = require("../models/Motoboy");
const geolib = require("geolib");

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
      console.log(
        `Tentando notificar motoboy ${motoboy.name} para o pedido ${order.orderNumber}`
      );

      // 1. Verificar se o motoboy ainda está disponível
      const currentMotoboyStatus = await Motoboy.findById(motoboy._id).select(
        "isAvailable"
      );

      if (!currentMotoboyStatus || !currentMotoboyStatus.isAvailable) {
        console.log(`Motoboy ${motoboy.name} não está mais disponível`);
        return false;
      }

      // 2. Criar uma notificação no banco de dados
      const Notification = require("../models/Notification"); // Você precisará criar este modelo
      const notification = new Notification({
        motoboyId: motoboy._id,
        type: "DELIVERY_REQUEST",
        title: "Nova solicitação de entrega",
        message: `Pedido #${order.orderNumber} - ${order.customer.name}`,
        data: {
          orderId: order._id,
          customerName: order.customer.name,
          customerAddress: order.customer.customerAddress,
          storeName: order.store.name,
          estimatedDistance: motoboy.distance || 0,
          estimatedTime: motoboy.estimatedTimeMinutes || 0,
          payment: {
            value: order.total,
            method: order.payment.method,
          },
        },
        expiresAt: new Date(Date.now() + 60000), // Expira em 1 minuto
      });

      // console.log(notification)

      await notification.save();

      // 3. Enviar a notificação por algum canal em tempo real

      // A. Opção com Firebase Cloud Messaging (FCM)
      if (process.env.ENABLE_FCM === "true") {
        const fcm = require("../services/fcmService"); // Você precisará criar este serviço
        await fcm.sendNotification(motoboy.fcmToken, {
          title: "Nova solicitação de entrega",
          body: `Pedido #${order.orderNumber} - ${order.customer.name}`,
          data: {
            notificationId: notification._id.toString(),
            orderId: order._id.toString(),
            type: "DELIVERY_REQUEST",
          },
        });
      }

      // 4. Aguardar a resposta do motoboy (com timeout)
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // Se o motoboy não responder em 30 segundos, considerar como recusado
          notification.status = "EXPIRED";
          notification
            .save()
            .catch((err) =>
              console.error("Erro ao atualizar notificação expirada:", err)
            );
          console.log(
            `Tempo limite excedido para motoboy ${motoboy.name} no pedido ${order.orderNumber}`
          );
          resolve(false);
        }, 30000); // 30 segundos
      });
    } catch (error) {
      console.error("Erro ao solicitar motoboy:", error);
      return false; // Em caso de erro, considerar como recusado
    }
  }
}

module.exports = new MotoboyService();
