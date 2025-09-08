// src/services/webPushService.js
import antiSpamHelper from "../utils/antiSpamHelper.js";

class WebPushService {
  constructor() {
    // Não executar código que depende de APIs do browser no constructor
    this.permission = "default";
    this.serviceWorkerRegistration = null;
    this.subscriptions = new Set(); // Para gerenciar múltiplas inscrições
    this.isNotificationSupported = false;
    this.initialized = false;

    // Sistema de throttling para evitar execuções repetidas
    this.lastStatusCheck = 0;
    this.lastDiagnostic = 0;
    this.lastInitialization = 0;
    this.statusCheckCooldown = 30000; // 30 segundos entre verificações
    this.diagnosticCooldown = 60000; // 1 minuto entre diagnósticos
    this.initializationCooldown = 10000; // 10 segundos entre inicializações

    // Configurar anti-spam para este serviço
    antiSpamHelper.configure({
      defaultCooldown: 10000, // 10 segundos
      maxCallsPerMinute: 5, // Máximo 5 chamadas por minuto
    });

    // Criar wrappers protegidos para métodos que podem causar spam
    this.protectedCheckStatus = antiSpamHelper.wrap(
      "webPush_checkStatus",
      this._internalCheckStatus.bind(this),
      30000 // 30 segundos entre verificações
    );

    this.protectedGetDiagnostics = antiSpamHelper.wrap(
      "webPush_getDiagnostics",
      this._internalGetDiagnostics.bind(this),
      60000 // 1 minuto entre diagnósticos
    );

    this.protectedInitialize = antiSpamHelper.wrap(
      "webPush_initialize",
      this._internalInitialize.bind(this),
      10000 // 10 segundos entre inicializações
    );
  }

  // Inicialização lazy - só executa quando realmente for usar
  init() {
    if (this.initialized) return;

    try {
      // Verificar se estamos no browser e se Notification API está disponível
      if (
        typeof window !== "undefined" &&
        typeof Notification !== "undefined"
      ) {
        this.permission = Notification.permission;
        this.isNotificationSupported = true;
      } else {
        console.warn("Notification API não está disponível");
        this.isNotificationSupported = false;
      }
    } catch (error) {
      console.warn("Erro ao inicializar Notification API:", error);
      this.isNotificationSupported = false;
    }

    this.initialized = true;
  }

  // Solicitar permissão para notificações
  async requestPermission() {
    this.init(); // Garantir que está inicializado

    if (!this.isNotificationSupported || !("Notification" in window)) {
      console.warn("Este navegador não suporta notificações");
      return false;
    }

    if (this.permission === "granted") {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      // Se permissão foi concedida, registrar service worker
      if (permission === "granted") {
        await this.registerServiceWorker();
      }

      return permission === "granted";
    } catch (error) {
      console.error("Erro ao solicitar permissão de notificação:", error);
      return false;
    }
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
        await new Promise((resolve, reject) => {
          const installingWorker = registration.installing;
          const timeout = setTimeout(() => {
            reject(new Error("Timeout aguardando ativação do Service Worker"));
          }, 10000); // 10 segundos timeout

          installingWorker.addEventListener("statechange", () => {
            try {
              if (installingWorker.state === "activated") {
                clearTimeout(timeout);
                resolve();
              } else if (installingWorker.state === "redundant") {
                clearTimeout(timeout);
                reject(new Error("Service Worker se tornou redundante"));
              }
            } catch (error) {
              clearTimeout(timeout);
              reject(error);
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
    this.init(); // Garantir que está inicializado

    if (!this.isNotificationSupported) {
      console.warn("Notificações não suportadas neste dispositivo");
      return null;
    }

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
        // Fallback para notificação normal (SEM actions) - apenas se Notification estiver disponível
        if (
          this.isNotificationSupported &&
          typeof Notification !== "undefined"
        ) {
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
        } else {
          console.warn("Notificações não suportadas neste dispositivo");
          return false;
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
    this.init(); // Garantir que está inicializado
    return this.permission === "granted";
  }

  // Verificar status atual - método público protegido
  async checkCurrentStatus() {
    return this.protectedCheckStatus();
  }

  // Método interno para verificação de status
  async _internalCheckStatus() {
    const now = Date.now();

    // Verificar cache primeiro
    if (this.cachedStatus && now < this.statusCacheExpiry) {
      console.log("� Retornando status do cache");
      return this.cachedStatus;
    }

    console.log("🔍 Verificando status das notificações...");

    // Atualizar permissão
    this.permission = Notification.permission;

    // Verificar se existe service worker registrado
    try {
      const existingRegistration =
        await navigator.serviceWorker.getRegistration("/");
      const hasServiceWorker = !!existingRegistration;

      const status = {
        supported: this.isSupported(),
        permission: this.permission,
        hasPermission: this.hasPermission(),
        serviceWorkerRegistered: hasServiceWorker,
        isFullyConfigured: this.hasPermission() && hasServiceWorker,
        timestamp: now,
      };

      // Cachear resultado por 30 segundos
      this.cachedStatus = status;
      this.statusCacheExpiry = now + 30000;

      console.log("📊 Status das notificações:", status);

      if (status.isFullyConfigured && !this.serviceWorkerRegistration) {
        console.log("🔄 Reconectando ao Service Worker...");
        this.serviceWorkerRegistration = existingRegistration;
        this.setupServiceWorkerListeners();
      }

      return status;
    } catch (error) {
      console.warn("Erro ao verificar status:", error);
      const errorStatus = {
        supported: this.isSupported(),
        permission: this.permission,
        hasPermission: this.hasPermission(),
        serviceWorkerRegistered: false,
        isFullyConfigured: false,
        error: error.message,
        timestamp: now,
      };

      this.cachedStatus = errorStatus;
      this.statusCacheExpiry = now + 10000;

      return errorStatus;
    }
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
    if (!navigator.serviceWorker) {
      console.warn("Service Worker não disponível para configurar listeners");
      return;
    }

    try {
      navigator.serviceWorker.addEventListener("message", (event) => {
        try {
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
        } catch (error) {
          console.error("Erro ao processar mensagem do Service Worker:", error);
        }
      });

      // Adicionar listener para erros do Service Worker
      navigator.serviceWorker.addEventListener("error", (error) => {
        console.error("Erro no Service Worker:", error);
      });

      console.log("✅ Listeners do Service Worker configurados");
    } catch (error) {
      console.error("Erro ao configurar listeners do Service Worker:", error);
    }
  }

  // Inicializar o serviço - método público protegido
  async initialize() {
    return this.protectedInitialize();
  }

  // Método interno de inicialização
  async _internalInitialize() {
    try {
      this.init(); // Garantir que está inicializado
      console.log("🔔 Inicializando WebPushService...");

      // Verificar suporte
      if (!this.isSupported()) {
        console.warn("❌ Notificações não são suportadas neste navegador");
        return false;
      }

      // Verificar se existe uma registration existente primeiro
      try {
        const existingRegistration =
          await navigator.serviceWorker.getRegistration("/");
        if (existingRegistration) {
          console.log("🔍 Service Worker existente encontrado");
          this.serviceWorkerRegistration = existingRegistration;
          this.setupServiceWorkerListeners();

          // Atualizar permissão atual
          if (typeof Notification !== "undefined") {
            this.permission = Notification.permission;
          }

          if (this.permission === "granted") {
            console.log(
              "✅ Reconectado ao Service Worker existente com permissão"
            );
            this.initialized = true;
            return true;
          } else {
            console.log(
              "⚠️ Service Worker reconectado, mas sem permissão de notificação"
            );
            this.initialized = true;
            return true;
          }
        }
      } catch (error) {
        console.warn("Erro ao verificar Service Worker existente:", error);
      }

      // Se já tem permissão, registrar service worker
      if (this.permission === "granted") {
        console.log("✅ Permissão já concedida, registrando Service Worker...");
        const swRegistered = await this.registerServiceWorker();
        if (swRegistered) {
          this.setupServiceWorkerListeners();
          console.log("🎉 WebPushService inicializado com sucesso!");
          this.initialized = true;
          return true;
        }
      }

      console.log(
        "⏳ WebPushService inicializado (aguardando permissão do usuário)"
      );
      this.initialized = true;
      return true;
    } catch (error) {
      console.error("❌ Erro durante inicialização do WebPushService:", error);
      return false;
    }
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

  // Diagnóstico do sistema - método público protegido
  getDiagnostics() {
    return this.protectedGetDiagnostics();
  }

  // Método interno para diagnóstico
  _internalGetDiagnostics() {
    const now = Date.now();

    // Verificar cache primeiro
    if (this.cachedDiagnostics && now < this.diagnosticsCacheExpiry) {
      console.log("📋 Retornando diagnóstico do cache");
      return this.cachedDiagnostics;
    }

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
      timestamp: now,
    };

    // Cachear diagnóstico por 1 minuto
    this.cachedDiagnostics = diagnostics;
    this.diagnosticsCacheExpiry = now + 60000;

    console.log("🔍 Diagnóstico WebPushService:", diagnostics);
    return diagnostics;
  }

  // Método para limpar cache e forçar nova verificação (se necessário)
  clearCache() {
    this.cachedStatus = null;
    this.cachedDiagnostics = null;
    this.statusCacheExpiry = 0;
    this.diagnosticsCacheExpiry = 0;
    antiSpamHelper.clear();
    console.log("🗑️ Cache e proteção anti-spam do WebPushService limpos");
  }

  // Obter estatísticas anti-spam
  getAntiSpamStats() {
    return antiSpamHelper.getStats();
  }

  // Método para verificar se está em cooldown
  isInCooldown(operation = "status") {
    const functionMap = {
      status: "webPush_checkStatus",
      diagnostic: "webPush_getDiagnostics",
      initialization: "webPush_initialize",
    };

    const functionName = functionMap[operation];
    if (!functionName) return false;

    return !antiSpamHelper.canExecute(functionName, 0);
  }
}

export default new WebPushService();
