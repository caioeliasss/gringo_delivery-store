// src/services/webPushService.js
class WebPushService {
  constructor() {
    this.permission = Notification.permission;
    this.serviceWorkerRegistration = null;
    this.subscriptions = new Set(); // Para gerenciar múltiplas inscrições
  }

  // Solicitar permissão para notificações
  async requestPermission() {
    if (!("Notification" in window)) {
      console.warn("Este navegador não suporta notificações");
      return false;
    }

    if (this.permission === "granted") {
      return true;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;

    // Se permissão foi concedida, registrar service worker
    if (permission === "granted") {
      await this.registerServiceWorker();
    }

    return permission === "granted";
  }

  // Registrar Service Worker para notificações em background
  async registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Workers não são suportados neste navegador");
      return false;
    }

    try {
      // Verificar se já existe um service worker registrado
      const existingRegistration =
        await navigator.serviceWorker.getRegistration("/");

      if (
        existingRegistration &&
        existingRegistration.scope === new URL("/", window.location).href
      ) {
        console.log("Service Worker já registrado:", existingRegistration);
        this.serviceWorkerRegistration = existingRegistration;
        return true;
      }

      // Registrar novo service worker
      const registration = await navigator.serviceWorker.register(
        "/sw-notifications.js",
        {
          scope: "/",
          updateViaCache: "none", // Garantir atualizações
        }
      );

      // Aguardar o service worker estar ativo
      if (registration.installing) {
        await new Promise((resolve) => {
          registration.installing.addEventListener("statechange", () => {
            if (registration.installing.state === "activated") {
              resolve();
            }
          });
        });
      }

      this.serviceWorkerRegistration = registration;
      console.log("Service Worker registrado com sucesso:", registration);

      // Configurar listeners
      this.setupServiceWorkerListeners();

      return true;
    } catch (error) {
      console.error("Erro ao registrar Service Worker:", error);
      return false;
    }
  }

  // Mostrar notificação (melhorada)
  showNotification(title, options = {}) {
    if (this.permission !== "granted") {
      console.warn("Permissão para notificações não concedida");
      return null;
    }

    const defaultOptions = {
      icon: "/logo_perfil.png", // Usar logo do app
      badge: "/favicon_trim.png", // Badge do app
      image: options.image || null, // Imagem grande opcional
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: options.silent || false, // Controle de som via silent
      tag: options.tag || "gringo-delivery", // Para agrupar notificações
      renotify: true,
      timestamp: Date.now(),
      data: {
        url: options.url || "/notificacoes",
        notificationId: options.notificationId,
        playSound: options.playSound !== false, // Por padrão toca som
        soundFile: options.soundFile || "/sounds/gringo-notification.wav",
        ...options.data,
      },
    };

    // Actions só são suportadas para Service Worker notifications
    const serviceWorkerOptions = {
      ...defaultOptions,
    };

    try {
      let notification;

      // Se temos service worker, usar notificação via service worker
      if (this.serviceWorkerRegistration) {
        // Notificação via Service Worker (persiste mesmo com aba fechada)
        this.serviceWorkerRegistration.showNotification(title, {
          ...serviceWorkerOptions,
          ...options,
        });

        // Reproduzir som se solicitado e não está silencioso
        if (defaultOptions.data.playSound && !options.silent) {
          this.playNotificationSound(defaultOptions.data.soundFile);
        }

        return true;
      } else {
        // Fallback para notificação normal (SEM actions)
        notification = new Notification(title, {
          ...defaultOptions,
          ...options,
          // Remover propriedades não suportadas no fallback
          actions: undefined,
          badge: undefined,
          data: undefined,
          timestamp: undefined,
          renotify: undefined,
        });

        // Reproduzir som se solicitado e não está silencioso
        if (defaultOptions.data.playSound && !options.silent) {
          this.playNotificationSound(defaultOptions.data.soundFile);
        }
      }

      // Auto-close após 8 segundos se não for interativa
      if (!options.requireInteraction && notification) {
        setTimeout(() => {
          notification.close();
        }, 8000);
      }

      // Handle click para notificação normal
      if (notification) {
        notification.onclick = (event) => {
          event.preventDefault();
          this.handleNotificationClick(event, options);
          notification.close();
        };
      }

      return notification;
    } catch (error) {
      console.error("Erro ao mostrar notificação:", error);
      return null;
    }
  }

  // Reproduzir som de notificação
  playNotificationSound(soundFile = "/sounds/gringo-notification.wav") {
    try {
      // Verificar se áudio é suportado
      if (!window.Audio) {
        console.warn("Audio não é suportado neste navegador");
        return false;
      }

      const audio = new Audio(soundFile);

      // Configurar volume (0.0 a 1.0)
      audio.volume = 0.7;

      // Configurar para tocar apenas uma vez
      audio.loop = false;

      // Promessa para lidar com problemas de autoplay
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("🔊 Som de notificação reproduzido:", soundFile);
          })
          .catch((error) => {
            console.warn(
              "⚠️ Não foi possível reproduzir som (autoplay bloqueado):",
              error.name
            );
            // Em caso de falha, tentar com interação do usuário
            if (error.name === "NotAllowedError") {
              console.log(
                "💡 Som será reproduzido após próxima interação do usuário"
              );
              this.queueSoundForUserInteraction(soundFile);
            }
          });
      }

      return true;
    } catch (error) {
      console.error("❌ Erro ao reproduzir som:", error);
      return false;
    }
  }

  // Fila de sons para reproduzir após interação do usuário
  queueSoundForUserInteraction(soundFile) {
    if (!this.pendingSounds) {
      this.pendingSounds = [];
    }

    this.pendingSounds.push(soundFile);

    // Configurar listener para próxima interação (apenas uma vez)
    if (!this.userInteractionListener) {
      this.userInteractionListener = () => {
        this.playPendingSounds();
        // Remover listener após primeira interação
        document.removeEventListener("click", this.userInteractionListener);
        document.removeEventListener("keydown", this.userInteractionListener);
        this.userInteractionListener = null;
      };

      document.addEventListener("click", this.userInteractionListener, {
        once: true,
      });
      document.addEventListener("keydown", this.userInteractionListener, {
        once: true,
      });
    }
  }

  // Reproduzir sons pendentes
  playPendingSounds() {
    if (!this.pendingSounds || this.pendingSounds.length === 0) return;

    // Reproduzir apenas o último som (evitar spam)
    const lastSound = this.pendingSounds[this.pendingSounds.length - 1];
    this.playNotificationSound(lastSound);

    // Limpar fila
    this.pendingSounds = [];
  }

  // Gerenciar cliques em notificações
  handleNotificationClick(event, options = {}) {
    // Focar na janela se estiver aberta
    if (window.parent) {
      window.parent.focus();
    } else {
      window.focus();
    }

    // Navegar para URL específica ou página de notificações
    const targetUrl = options.url || "/notificacoes";

    if (options.openInNewTab) {
      window.open(targetUrl, "_blank");
    } else {
      // Tentar navegar na mesma aba
      if (window.location.pathname !== targetUrl) {
        window.location.href = targetUrl;
      }
    }
  }

  // Mostrar notificação de suporte (método específico)
  showSupportNotification(title, options = {}) {
    const notificationTitle = title || "Nova Notificação de Suporte";

    const baseOptions = {
      body: options.body || options.message,
      icon: "/logo_perfil.png",
      tag: options.tag || `support-${Date.now()}`,
      requireInteraction:
        options.priority === "high" || options.requireInteraction,
      data: {
        notificationId: options.notificationId,
        type: options.type || "support",
        priority: options.priority,
        url: options.url || "/notificacoes",
        ...options.data,
      },
      // Adicionar som para notificações importantes
      silent: options.priority === "low" || options.silent === true,
      vibrate: this.getVibratePattern(options.type, options.priority),
    };

    // Personalizar ícone por tipo (apenas para Service Worker, fallback usa ícone padrão)
    if (this.serviceWorkerRegistration) {
      switch (options.type) {
        case "SUPPORT_ALERT":
        case "alert":
          baseOptions.badge = "/favicon_trim.png";
          baseOptions.requireInteraction = true;
          break;
        case "ERROR":
        case "error":
          baseOptions.badge = "/favicon_trim.png";
          baseOptions.requireInteraction = true;
          break;
        case "SYSTEM":
        case "system":
          baseOptions.badge = "/favicon_trim.png";
          break;
        default:
          baseOptions.badge = "/favicon_trim.png";
      }
    }

    return this.showNotification(notificationTitle, baseOptions);
  }

  // Obter padrão de vibração baseado no tipo e prioridade
  getVibratePattern(type, priority) {
    if (priority === "high") {
      return [300, 100, 300, 100, 300];
    }

    switch (type) {
      case "SUPPORT_ALERT":
      case "alert":
        return [300, 100, 300, 100, 300];
      case "ERROR":
      case "error":
        return [500, 200, 500];
      case "SYSTEM":
      case "system":
        return [200];
      default:
        return [200, 100, 200];
    }
  }

  // Verificar se notificações estão disponíveis
  isSupported() {
    return "Notification" in window;
  }

  // Verificar se tem permissão
  hasPermission() {
    return this.permission === "granted";
  }

  // Limpar todas as notificações
  clearAllNotifications() {
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration
        .getNotifications()
        .then((notifications) => {
          notifications.forEach((notification) => notification.close());
        });
    }
  }

  // Configurar listeners para eventos do service worker
  setupServiceWorkerListeners() {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "NOTIFICATION_CLICK") {
        this.handleNotificationClick(event, event.data.options || {});
      }

      // Novo: Reproduzir som quando solicitado pelo Service Worker
      if (event.data && event.data.type === "PLAY_NOTIFICATION_SOUND") {
        const soundFile =
          event.data.soundFile || "/sounds/gringo-notification.wav";
        console.log(
          "🔊 Service Worker solicitou reprodução de som:",
          soundFile
        );
        this.playNotificationSound(soundFile);
      }
    });
  }

  // Inicializar o serviço
  async initialize() {
    console.log("🔔 Inicializando WebPushService...");

    // Verificar suporte
    if (!this.isSupported()) {
      console.warn("❌ Notificações não são suportadas neste navegador");
      return false;
    }

    // Se já tem permissão, registrar service worker
    if (this.permission === "granted") {
      console.log("✅ Permissão já concedida, registrando Service Worker...");
      const swRegistered = await this.registerServiceWorker();
      if (swRegistered) {
        this.setupServiceWorkerListeners();
        console.log("🎉 WebPushService inicializado com sucesso!");
        return true;
      }
    }

    console.log(
      "⏳ WebPushService inicializado (aguardando permissão do usuário)"
    );
    return true; // Retorna true mesmo sem permissão para permitir solicitação posterior
  }

  // Método conveniente para inicializar com solicitação de permissão
  async initializeWithPermissionRequest() {
    const initialized = await this.initialize();
    if (!initialized) return false;

    const hasPermission = await this.requestPermission();
    if (hasPermission) {
      console.log("🎉 WebPushService totalmente configurado!");
    }

    return hasPermission;
  }

  // Teste de notificação
  testNotification() {
    console.log("🧪 Testando notificação...");
    return this.showNotification("Teste de Notificação", {
      body: "Esta é uma notificação de teste do Gringo Delivery!",
      requireInteraction: false,
      tag: "test-notification",
    });
  }

  // Diagnóstico do sistema
  getDiagnostics() {
    const diagnostics = {
      supported: this.isSupported(),
      permission: this.permission,
      hasPermission: this.hasPermission(),
      serviceWorkerSupported: "serviceWorker" in navigator,
      serviceWorkerRegistered: !!this.serviceWorkerRegistration,
      serviceWorkerActive: this.serviceWorkerRegistration?.active?.state,
      userAgent: navigator.userAgent,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
    };

    console.log("🔍 Diagnóstico WebPushService:", diagnostics);
    return diagnostics;
  }
}

export default new WebPushService();
