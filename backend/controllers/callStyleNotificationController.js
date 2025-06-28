/**
 * Exemplo prático de uso das notificações estilo chamada WhatsApp
 * Este arquivo demonstra como integrar as notificações em diferentes cenários
 */

const notificationService = require('../services/notificationService');

class CallStyleNotificationController {
  
  /**
   * Exemplo 1: Notificar motoboy sobre entrega urgente
   */
  static async notifyUrgentDelivery(req, res) {
    try {
      const { motoboyId, orderData, urgencyLevel = 'high' } = req.body;

      // Determinar timeout baseado no nível de urgência
      const timeoutMap = {
        'low': 120,    // 2 minutos
        'medium': 90,  // 1.5 minutos  
        'high': 60,    // 1 minuto
        'critical': 30 // 30 segundos
      };

      const timeout = timeoutMap[urgencyLevel] || 60;

      const result = await notificationService.createCallStyleNotification({
        motoboyId: motoboyId,
        title: `🚨 ENTREGA URGENTE - ${orderData.store.name}`,
        message: `Pedido #${orderData.orderNumber} • Valor: R$ ${orderData.total}`,
        timeoutSeconds: timeout,
        screen: 'UrgentDeliveryAccept',
        additionalData: {
          orderId: orderData._id,
          orderNumber: orderData.orderNumber,
          storeName: orderData.store.name,
          storeAddress: orderData.store.address,
          customerName: orderData.customer.name,
          customerAddress: orderData.customer.address,
          customerPhone: orderData.customer.phone,
          totalValue: orderData.total,
          urgencyLevel: urgencyLevel,
          estimatedDistance: orderData.estimatedDistance,
          estimatedTime: orderData.estimatedTime,
          priority: urgencyLevel === 'critical' ? 1 : urgencyLevel === 'high' ? 2 : 3
        }
      }, req.app);

      console.log(`Notificação de entrega urgente enviada para motoboy ${motoboyId}: ${result.callId}`);

      res.status(201).json({
        success: true,
        callId: result.callId,
        message: 'Notificação de entrega urgente enviada com sucesso',
        timeout: timeout,
        urgencyLevel: urgencyLevel
      });

    } catch (error) {
      console.error('Erro ao enviar notificação de entrega urgente:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Exemplo 2: Notificar suporte sobre problema crítico
   */
  static async notifySupporCriticalIssue(req, res) {
    try {
      const { issueData, reportedBy, severity = 'high' } = req.body;

      // Buscar todos os membros do suporte
      const SupportTeam = require('../models/SupportTeam');
      const supportMembers = await SupportTeam.find({ active: true });

      if (supportMembers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nenhum membro de suporte ativo encontrado'
        });
      }

      const notifications = [];

      // Enviar notificação estilo chamada para cada membro do suporte
      for (const member of supportMembers) {
        try {
          const result = await notificationService.createCallStyleNotification({
            firebaseUid: member.firebaseUid,
            title: `🆘 PROBLEMA ${severity.toUpperCase()}`,
            message: `${issueData.title} - ${reportedBy.name}`,
            timeoutSeconds: severity === 'critical' ? 30 : 60,
            screen: 'SupportIssueDetails',
            additionalData: {
              issueId: issueData._id,
              issueTitle: issueData.title,
              issueDescription: issueData.description,
              reportedBy: reportedBy,
              severity: severity,
              category: issueData.category,
              timestamp: new Date().toISOString(),
              requiresImmedateAction: severity === 'critical'
            }
          }, req.app);

          notifications.push({
            supportMemberId: member._id,
            supportMemberName: member.name,
            callId: result.callId,
            status: 'sent'
          });

        } catch (memberError) {
          console.error(`Erro ao enviar notificação para ${member.name}:`, memberError);
          notifications.push({
            supportMemberId: member._id,
            supportMemberName: member.name,
            callId: null,
            status: 'failed',
            error: memberError.message
          });
        }
      }

      res.status(201).json({
        success: true,
        message: 'Notificações de problema crítico enviadas',
        totalSent: notifications.filter(n => n.status === 'sent').length,
        totalFailed: notifications.filter(n => n.status === 'failed').length,
        notifications: notifications
      });

    } catch (error) {
      console.error('Erro ao enviar notificações de problema crítico:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Exemplo 3: Notificar loja sobre problema com pedido
   */
  static async notifyStoreOrderIssue(req, res) {
    try {
      const { storeId, orderData, issueType, motoboyData } = req.body;

      const Store = require('../models/Store');
      const store = await Store.findById(storeId);

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Loja não encontrada'
        });
      }

      // Mapear tipos de problema para títulos e timeouts
      const issueConfig = {
        'delivery_delay': {
          title: '⏰ Atraso na Entrega',
          timeout: 120,
          screen: 'DeliveryTrack'
        },
        'customer_not_found': {
          title: '🏠 Cliente Não Encontrado',
          timeout: 180,
          screen: 'CustomerContact'
        },
        'order_damaged': {
          title: '📦 Pedido Danificado',
          timeout: 300,
          screen: 'OrderIssueResolution'
        },
        'payment_issue': {
          title: '💳 Problema no Pagamento',
          timeout: 240,
          screen: 'PaymentResolution'
        },
        'address_error': {
          title: '📍 Erro no Endereço',
          timeout: 180,
          screen: 'AddressCorrection'
        }
      };

      const config = issueConfig[issueType] || {
        title: '⚠️ Problema com Pedido',
        timeout: 180,
        screen: 'OrderIssueGeneric'
      };

      const result = await notificationService.createCallStyleNotification({
        firebaseUid: store.firebaseUid,
        title: config.title,
        message: `Pedido #${orderData.orderNumber} - ${motoboyData.name}`,
        timeoutSeconds: config.timeout,
        screen: config.screen,
        additionalData: {
          orderId: orderData._id,
          orderNumber: orderData.orderNumber,
          issueType: issueType,
          motoboyId: motoboyData._id,
          motoboyName: motoboyData.name,
          motoboyPhone: motoboyData.phone,
          customerName: orderData.customer.name,
          customerAddress: orderData.customer.address,
          customerPhone: orderData.customer.phone,
          reportedAt: new Date().toISOString(),
          requiresStoreAction: true
        }
      }, req.app);

      console.log(`Notificação de problema enviada para loja ${store.storeName}: ${result.callId}`);

      res.status(201).json({
        success: true,
        callId: result.callId,
        message: 'Notificação de problema enviada para a loja',
        issueType: issueType,
        storeName: store.storeName
      });

    } catch (error) {
      console.error('Erro ao enviar notificação de problema para loja:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Exemplo 4: Sistema de chat com notificação de chamada
   */
  static async notifyIncomingCall(req, res) {
    try {
      const { fromUserId, toUserId, callType = 'voice', chatId } = req.body;

      // Buscar dados dos usuários
      const [fromUser, toUser] = await Promise.all([
        findUserByAnyModel(fromUserId),
        findUserByAnyModel(toUserId)
      ]);

      if (!fromUser || !toUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Determinar emoji e tela baseado no tipo de chamada
      const callConfig = {
        'voice': {
          emoji: '📞',
          title: 'Chamada de Voz',
          screen: 'VoiceCall'
        },
        'video': {
          emoji: '📹',
          title: 'Chamada de Vídeo', 
          screen: 'VideoCall'
        },
        'emergency': {
          emoji: '🚨',
          title: 'Chamada de Emergência',
          screen: 'EmergencyCall'
        }
      };

      const config = callConfig[callType] || callConfig['voice'];

      const result = await notificationService.createCallStyleNotification({
        firebaseUid: toUser.firebaseUid,
        title: `${config.emoji} ${config.title}`,
        message: `${fromUser.name || fromUser.storeName} está chamando...`,
        timeoutSeconds: 30, // Timeout padrão para chamadas
        screen: config.screen,
        additionalData: {
          fromUserId: fromUser._id,
          fromUserName: fromUser.name || fromUser.storeName,
          fromUserType: fromUser.userType || 'unknown',
          toUserId: toUser._id,
          toUserName: toUser.name || toUser.storeName,
          toUserType: toUser.userType || 'unknown',
          callType: callType,
          chatId: chatId,
          isCall: true,
          startedAt: new Date().toISOString()
        }
      }, req.app);

      console.log(`Notificação de chamada ${callType} enviada de ${fromUser.name || fromUser.storeName} para ${toUser.name || toUser.storeName}: ${result.callId}`);

      res.status(201).json({
        success: true,
        callId: result.callId,
        message: 'Notificação de chamada enviada',
        callType: callType,
        from: fromUser.name || fromUser.storeName,
        to: toUser.name || toUser.storeName
      });

    } catch (error) {
      console.error('Erro ao enviar notificação de chamada:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Exemplo 5: Resposta automática com timeout
   */
  static async handleCallTimeout(req, res) {
    try {
      const { callId } = req.params;

      // Buscar a notificação
      const Notification = require('../models/Notification');
      const notification = await Notification.findOne({
        "data.callId": callId,
        type: "CALL_STYLE",
        status: "PENDING"
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Chamada não encontrada ou já foi processada'
        });
      }

      // Marcar como expirada
      notification.status = 'EXPIRED';
      notification.data = {
        ...notification.data,
        expiredAt: new Date(),
        reason: 'timeout'
      };

      await notification.save();

      // Enviar evento SSE de timeout
      if (req.app?.locals?.sendEventToStore) {
        req.app.locals.sendEventToStore(
          notification.firebaseUid,
          "callTimeout",
          {
            callId,
            reason: 'timeout',
            originalNotification: notification
          }
        );
      }

      console.log(`Chamada ${callId} expirada por timeout`);

      res.json({
        success: true,
        callId,
        status: 'expired',
        reason: 'timeout',
        message: 'Chamada expirada por timeout'
      });

    } catch (error) {
      console.error('Erro ao processar timeout da chamada:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

/**
 * Função auxiliar para buscar usuário em qualquer modelo
 */
async function findUserByAnyModel(userId) {
  const Motoboy = require('../models/Motoboy');
  const Store = require('../models/Store');
  const SupportTeam = require('../models/SupportTeam');

  // Tentar buscar como motoboy
  let user = await Motoboy.findById(userId);
  if (user) {
    user.userType = 'motoboy';
    return user;
  }

  // Tentar buscar como loja
  user = await Store.findById(userId);
  if (user) {
    user.userType = 'store';
    return user;
  }

  // Tentar buscar como suporte
  user = await SupportTeam.findById(userId);
  if (user) {
    user.userType = 'support';
    return user;
  }

  return null;
}

module.exports = CallStyleNotificationController;
