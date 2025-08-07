// Service Worker para notificações do Gringo Delivery
console.log("Gringo Delivery SW: Service Worker iniciado");

// Cache de notificações para evitar duplicatas
const notificationCache = new Map();

// Listener para instalação do service worker
self.addEventListener("install", (event) => {
  console.log("Gringo Delivery SW: Instalando service worker");
  self.skipWaiting(); // Ativa imediatamente
});

// Listener para ativação do service worker
self.addEventListener("activate", (event) => {
  console.log("Gringo Delivery SW: Service worker ativado");
  event.waitUntil(self.clients.claim()); // Assume controle de todas as páginas
});

// Listener para notificações push
self.addEventListener("push", (event) => {
  console.log("Gringo Delivery SW: Recebida notificação push", event.data);

  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const options = {
    body: data.body || "Nova notificação do Gringo Delivery",
    icon: "/logo192.png",
    badge: "/favicon_trim.png",
    image: data.image || "/logo-sem-fundo.png",
    tag: data.tag || "gringo-notification",
    data: data,
    requireInteraction: data.requireInteraction !== false,
    actions: [
      {
        action: "view",
        title: "Ver Detalhes",
        icon: "/logo192.png",
      },
      {
        action: "dismiss",
        title: "Dispensar",
      },
    ],
    vibrate: [200, 100, 200],
    silent: data.silent || false, // Respeitar configuração de silêncio
  };

  event.waitUntil(
    Promise.all([
      // Mostrar notificação
      self.registration.showNotification(
        data.title || "Gringo Delivery",
        options
      ),
      // Reproduzir som se não estiver silencioso (via postMessage para main thread)
      !data.silent && data.playSound !== false
        ? sendSoundRequestToMainThread(
            data.soundFile || "/sounds/gringo-notification.wav"
          )
        : Promise.resolve(),
    ])
  );
});

// Listener para clique em notificações
self.addEventListener("notificationclick", (event) => {
  console.log(
    "Gringo Delivery SW: Notificação clicada",
    event.notification,
    event.action
  );

  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  // Se clicou em "dispensar", apenas fecha
  if (action === "dismiss") {
    return;
  }

  // Determinar URL baseada no tipo de notificação
  let targetUrl = "/";

  if (notificationData.type) {
    switch (notificationData.type) {
      case "order":
        targetUrl = "/pedidos";
        break;
      case "delivery":
        targetUrl = "/entregas";
        break;
      case "support":
        targetUrl = "/notificacoes";
        break;
      case "financial":
        targetUrl = "/financeiro";
        break;
      case "system":
        targetUrl = "/configuracoes";
        break;
      default:
        targetUrl = notificationData.url || "/";
    }
  } else if (notificationData.url) {
    targetUrl = notificationData.url;
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Procurar por uma janela já aberta com a URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (
            client.url.includes(targetUrl.split("?")[0]) &&
            "focus" in client
          ) {
            return client.focus();
          }
        }

        // Se não encontrou janela aberta, abrir nova
        if (clients.openWindow) {
          const fullUrl = new URL(targetUrl, self.location.origin).href;
          return clients.openWindow(fullUrl);
        }
      })
      .then((windowClient) => {
        // Enviar dados da notificação para a janela
        if (windowClient && notificationData) {
          windowClient.postMessage({
            type: "NOTIFICATION_CLICK",
            data: notificationData,
            action: action,
          });
        }
      })
  );
});

// Listener para fechamento de notificações
self.addEventListener("notificationclose", (event) => {
  console.log("Gringo Delivery SW: Notificação fechada", event.notification);

  // Opcional: registrar analytics de notificações fechadas
  const notificationData = event.notification.data || {};
  if (notificationData.trackClose) {
    // Implementar tracking se necessário
  }
});

// Função para mostrar notificação personalizada (chamada pelo main thread)
self.addEventListener("message", (event) => {
  console.log("Gringo Delivery SW: Mensagem recebida", event.data);

  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;

    // Verificar cache para evitar duplicatas
    const cacheKey = `${title}-${options.tag || Date.now()}`;
    if (notificationCache.has(cacheKey)) {
      console.log("Gringo Delivery SW: Notificação duplicada ignorada");
      return;
    }

    // Adicionar ao cache por 5 minutos
    notificationCache.set(cacheKey, true);
    setTimeout(() => notificationCache.delete(cacheKey), 5 * 60 * 1000);

    // Configurações padrão
    const defaultOptions = {
      icon: "/logo192.png",
      badge: "/favicon_trim.png",
      tag: "gringo-notification",
      requireInteraction: true,
      vibrate: [200, 100, 200],
    };

    const finalOptions = { ...defaultOptions, ...options };

    self.registration
      .showNotification(title, finalOptions)
      .then(() => {
        console.log("Gringo Delivery SW: Notificação mostrada com sucesso");
      })
      .catch((error) => {
        console.error("Gringo Delivery SW: Erro ao mostrar notificação", error);
      });
  }
});

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of notificationCache.entries()) {
    if (now - timestamp > 5 * 60 * 1000) {
      // 5 minutos
      notificationCache.delete(key);
    }
  }
}, 60 * 1000); // Verificar a cada minuto

// Função para solicitar reprodução de som via main thread
async function sendSoundRequestToMainThread(soundFile) {
  try {
    // Enviar mensagem para todas as janelas/tabs abertas
    const clients = await self.clients.matchAll({ includeUncontrolled: true });

    clients.forEach((client) => {
      client.postMessage({
        type: "PLAY_NOTIFICATION_SOUND",
        soundFile: soundFile,
      });
    });

    console.log(
      "Gringo Delivery SW: Solicitação de som enviada para",
      clients.length,
      "cliente(s)"
    );
  } catch (error) {
    console.error(
      "Gringo Delivery SW: Erro ao solicitar reprodução de som:",
      error
    );
  }
}

console.log("Gringo Delivery SW: Service Worker configurado completamente");
