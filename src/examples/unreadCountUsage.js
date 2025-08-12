// Exemplo de uso do sistema de unreadCount implementado

// 1. Quando uma mensagem é enviada
/*
POST /api/chat/message
{
  "chatId": "6836dc5f9de7047de019e67c",
  "message": "Olá, preciso de ajuda",
  "sender": "6YAuQyBa40gGR0SjeTzKxCJTe352",
  "messageType": "TEXT"
}

Resultado:
- A mensagem é criada no ChatMessage
- O campo lastMessage do Chat é atualizado
- O unreadCount é incrementado para todos os outros participantes
- Notificações são enviadas para os outros participantes
*/

// 2. Para marcar mensagens como lidas
/*
PUT /api/chat/message/{chatId}/read/{firebaseUid}

Exemplo: PUT /api/chat/message/6836dc5f9de7047de019e67c/read/umsIgjDVQEPflPwrKRMinRL8TYP2

Resultado:
- O unreadCount do participante é zerado
- O lastRead é atualizado para a data atual
- As mensagens individuais são marcadas como lidas
*/

// 3. Para verificar contagem de mensagens não lidas (OTIMIZADA)
/*
GET /api/chat/message/unread/{userId}

Exemplo: GET /api/chat/message/unread/umsIgjDVQEPflPwrKRMinRL8TYP2

Resposta:
{
  "totalUnreadCount": 5,
  "chatUnreadCounts": {
    "6836dc5f9de7047de019e67c": 3,
    "6836dc5f9de7047de019e67d": 2
  },
  "chats": 2
}
*/

// 4. Para verificar se há mensagens não lidas (OTIMIZADA)
/*
GET /api/chat/message/has-unread/{userId}

Exemplo: GET /api/chat/message/has-unread/umsIgjDVQEPflPwrKRMinRL8TYP2

Resposta:
{
  "hasUnreadMessages": true,
  "timestamp": "2025-08-12T16:30:00.000Z"
}
*/

// 5. Exemplo de como o Chat document fica após as atualizações:
const exemploChat = {
  _id: "6836dc5f9de7047de019e67c",
  firebaseUid: ["umsIgjDVQEPflPwrKRMinRL8TYP2", "6YAuQyBa40gGR0SjeTzKxCJTe352"],
  chatType: "SUPPORT",
  status: "ACTIVE",
  participants: [
    {
      firebaseUid: "umsIgjDVQEPflPwrKRMinRL8TYP2",
      name: "caio elias - Suporte",
      userType: "SUPPORT",
      unreadCount: 0, // Zerado após marcar como lida
      lastRead: "2025-08-12T16:30:00.000Z", // Atualizado
    },
    {
      firebaseUid: "6YAuQyBa40gGR0SjeTzKxCJTe352",
      name: "Caio Elias",
      userType: "MOTOBOY",
      unreadCount: 3, // Incrementado a cada nova mensagem
      lastRead: "2025-08-12T14:50:00.000Z",
    },
  ],
  lastMessage: "67523abc123def456789gh01", // ID da última mensagem
  createdAt: "2025-05-28T09:50:23.888Z",
  updatedAt: "2025-08-12T16:30:00.000Z", // Atualizado
};

// 6. Fluxo completo de uma conversa:

// Passo 1: Usuário A envia mensagem
// POST /api/chat/message
// - unreadCount do Usuário B é incrementado de 2 para 3
// - Notificação é enviada para Usuário B

// Passo 2: Usuário B abre o chat
// PUT /api/chat/message/{chatId}/read/{userB_firebaseUid}
// - unreadCount do Usuário B é zerado (3 → 0)
// - lastRead é atualizado

// Passo 3: Verificar badges em tempo real
// GET /api/chat/message/has-unread/{userB_firebaseUid}
// - Retorna hasUnreadMessages: false (porque foi zerado)

// 7. Benefícios das otimizações implementadas:

/*
ANTES (consulta pesada):
- Para cada chat, contava mensagens no ChatMessage
- Múltiplas consultas no banco
- Performance ruim com muitas mensagens

DEPOIS (otimizado):
- unreadCount já está no documento do Chat
- Uma única consulta para todos os chats
- Performance muito melhor
- Atualizações em tempo real mais eficientes
*/

// 8. Cache integration com as novas funções:
import { cachedRequest, invalidateCache } from "../services/api";

// Cache das contagens de mensagens não lidas por 30 segundos
const getUnreadCountWithCache = async (userId) => {
  return await cachedRequest(
    {
      url: `/chat/message/unread/${userId}`,
      method: "GET",
    },
    30 * 1000
  ); // 30 segundos de cache
};

// Invalidar cache quando mensagem é enviada ou lida
const sendMessageAndInvalidateCache = async (messageData) => {
  await api.post("/chat/message", messageData);
  invalidateCache("message/unread"); // Invalidar cache de unread
  invalidateCache("message/has-unread"); // Invalidar cache de has-unread
};

// 9. Exemplo de uso no frontend (React):
function ChatBadge({ userId }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get(`/chat/message/unread/${userId}`);
        setUnreadCount(response.data.totalUnreadCount);
      } catch (error) {
        console.error("Erro ao buscar contagem:", error);
      }
    };

    fetchUnreadCount();

    // WebSocket listener para atualizações em tempo real
    socket.on("newMessage", () => {
      fetchUnreadCount(); // Recarregar quando nova mensagem chegar
    });

    socket.on("messageRead", () => {
      fetchUnreadCount(); // Recarregar quando mensagem for lida
    });

    return () => {
      socket.off("newMessage");
      socket.off("messageRead");
    };
  }, [userId]);

  return unreadCount > 0 ? (
    <Badge badgeContent={unreadCount} color="error">
      <ChatIcon />
    </Badge>
  ) : (
    <ChatIcon />
  );
}

export { exemploChat, getUnreadCountWithCache, sendMessageAndInvalidateCache };
