const express = require('express');
const router = express.Router();
const CallStyleNotificationController = require('../controllers/callStyleNotificationController');

/**
 * Rotas para exemplos práticos de notificações estilo chamada WhatsApp
 */

// Exemplo 1: Notificar motoboy sobre entrega urgente
router.post('/urgent-delivery', CallStyleNotificationController.notifyUrgentDelivery);

// Exemplo 2: Notificar suporte sobre problema crítico  
router.post('/support-critical', CallStyleNotificationController.notifySupporCriticalIssue);

// Exemplo 3: Notificar loja sobre problema com pedido
router.post('/store-order-issue', CallStyleNotificationController.notifyStoreOrderIssue);

// Exemplo 4: Sistema de chat com notificação de chamada
router.post('/incoming-call', CallStyleNotificationController.notifyIncomingCall);

// Exemplo 5: Processar timeout de chamada
router.post('/timeout/:callId', CallStyleNotificationController.handleCallTimeout);

module.exports = router;
