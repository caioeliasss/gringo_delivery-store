import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Container,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  CircularProgress,
  Badge,
  InputAdornment,
  Tooltip,
  useTheme,
  useMediaQuery,
  Chip,
  Drawer,
  AppBar,
  Toolbar,
  Card,
  CardContent,
} from "@mui/material";
import {
  Send as SendIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Menu as MenuIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  DirectionsBike as MotoboyIcon,
  Store as StoreIcon,
  Circle as CircleIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  NotificationsOff as NotificationsOffIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../../services/api";
import { useLocation, useNavigate } from "react-router-dom";

// Definições de cores baseadas no tipo de usuário
const USER_TYPES = {
  SUPPORT: {
    color: "#EB2E3E", // Cor primária do Gringo
    lightColor: "#ffebee",
    icon: <PersonIcon />,
    name: "Suporte",
  },
  MOTOBOY: {
    color: "#FF9800",
    lightColor: "#fff3e0",
    icon: <MotoboyIcon />,
    name: "Motoboy",
  },
  STORE: {
    color: "#4CAF50",
    lightColor: "#e8f5e9",
    icon: <StoreIcon />,
    name: "Estabelecimento",
  },
  CUSTOMER: {
    color: "#2196F3",
    lightColor: "#e3f2fd",
    icon: <PersonIcon />,
    name: "Cliente",
  },
};

const ChatPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // Estado para chats e mensagens
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const [sendingMessage, setSendingMessage] = useState(false);

  // Efeito para verificar se o usuário está autenticado como suporte
  useEffect(() => {
    const checkIfIsSupportTeam = async () => {
      try {
        const response = await api.get(`/support/firebase/${currentUser?.uid}`);
        if (!response.data) {
          navigate("/suporte/login");
        }
      } catch (error) {
        console.error("Erro ao verificar o usuário:", error);
        navigate("/suporte/login");
      }
    };

    checkIfIsSupportTeam();
  }, [currentUser, navigate]);

  // Inicializar com chat da rota (se houver)
  useEffect(() => {
    if (location.state?.chatId) {
      fetchChatById(location.state.chatId);
    }
  }, [location.state]);

  // Carregar a lista de chats
  useEffect(() => {
    fetchChats();
  }, [currentUser]);

  // Rolar para a última mensagem quando elas mudam
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Marca as mensagens como lidas quando o chat está ativo
  useEffect(() => {
    if (activeChat) {
      markMessagesAsRead();
    }
  }, [activeChat, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Buscar todos os chats do usuário
  const fetchChats = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const response = await api.get(`/chat/user/${currentUser.uid}`);
      const chatData = response.data;

      // Buscar contagens de mensagens não lidas
      const unreadResponse = await api.get(
        `/chat/message/unread/${currentUser.uid}`
      );
      const unreadData = unreadResponse.data;

      // Adicionar contagem de não lidas aos chats
      const chatsWithUnread = chatData.map((chat) => {
        const chatUnread = unreadData.chats.find((c) => c.chatId === chat._id);
        return {
          ...chat,
          unreadCount: chatUnread ? chatUnread.count : 0,
        };
      });

      setChats(chatsWithUnread);

      // Carregar perfis dos usuários em todos os chats
      await Promise.all(
        chatData.flatMap((chat) =>
          chat.firebaseUid.map((uid) => loadUserProfile(uid))
        )
      );

      // Se temos uma chatId da navegação e não temos activeChat, selecionamos automaticamente
      if (location.state?.chatId && !activeChat) {
        const selectedChat = chatsWithUnread.find(
          (c) => c._id === location.state.chatId
        );
        if (selectedChat) {
          setActiveChat(selectedChat);
          fetchMessages(selectedChat._id);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar chats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar chat específico por ID
  const fetchChatById = async (chatId) => {
    try {
      const response = await api.get(`/chat/${chatId}`);
      const chatData = response.data;

      // Buscar os perfis dos usuários deste chat
      await Promise.all(
        chatData.firebaseUid.map((uid) => loadUserProfile(uid))
      );

      setActiveChat(chatData);
      fetchMessages(chatId);
    } catch (error) {
      console.error("Erro ao carregar chat específico:", error);
    }
  };

  // Carregar perfil do usuário
  const loadUserProfile = async (uid) => {
    // Se já temos o perfil deste usuário, não precisamos buscar novamente
    if (userProfiles[uid]) return;

    try {
      // Primeiro tentamos como motoboy
      try {
        const motoboyResponse = await api.get(`/motoboys/firebase/${uid}`);
        if (motoboyResponse.data) {
          setUserProfiles((prev) => ({
            ...prev,
            [uid]: {
              ...motoboyResponse.data,
              type: "MOTOBOY",
            },
          }));
          return;
        }
      } catch (e) {}

      // Depois como estabelecimento
      try {
        const storeResponse = await api.get(`/stores/firebase/${uid}`);
        if (storeResponse.data) {
          setUserProfiles((prev) => ({
            ...prev,
            [uid]: {
              ...storeResponse.data,
              type: "STORE",
            },
          }));
          return;
        }
      } catch (e) {}

      // Depois como cliente
      try {
        const customerResponse = await api.get(`/customers/firebase/${uid}`);
        if (customerResponse.data) {
          setUserProfiles((prev) => ({
            ...prev,
            [uid]: {
              ...customerResponse.data,
              type: "CUSTOMER",
            },
          }));
          return;
        }
      } catch (e) {}

      // Finalmente como suporte
      try {
        const supportResponse = await api.get(`/support/firebase/${uid}`);
        if (supportResponse.data) {
          setUserProfiles((prev) => ({
            ...prev,
            [uid]: {
              ...supportResponse.data,
              type: "SUPPORT",
            },
          }));
          return;
        }
      } catch (e) {}

      // Caso não encontre em nenhum endpoint, adicionamos um perfil vazio
      setUserProfiles((prev) => ({
        ...prev,
        [uid]: {
          name: "Usuário desconhecido",
          type: "UNKNOWN",
        },
      }));
    } catch (error) {
      console.error(`Erro ao carregar perfil do usuário ${uid}:`, error);
    }
  };

  // Buscar mensagens de um chat
  const fetchMessages = async (chatId) => {
    try {
      setMessageLoading(true);
      const response = await api.get(`/chat/message/${chatId}`);
      setMessages(response.data);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      setMessageLoading(false);
    }
  };

  // Marcar mensagens como lidas
  const markMessagesAsRead = async () => {
    if (!activeChat || !currentUser) return;

    try {
      await api.put(`/chat/message/${activeChat._id}/read/${currentUser.uid}`);

      // Atualizar contagem de não lidas no estado
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat._id === activeChat._id ? { ...chat, unreadCount: 0 } : chat
        )
      );
    } catch (error) {
      console.error("Erro ao marcar mensagens como lidas:", error);
    }
  };

  // Enviar nova mensagem
  const handleSendMessage = async (e) => {
    e?.preventDefault();

    if (!newMessage.trim() || !activeChat || !currentUser) return;

    try {
      setSendingMessage(true);

      const messageData = {
        chatId: activeChat._id,
        message: newMessage.trim(),
        sender: currentUser.uid,
      };

      const response = await api.post("/chat/message", messageData);

      // Adicionar mensagem à lista local
      setMessages((prev) => [...prev, response.data]);

      // Limpar campo de mensagem
      setNewMessage("");

      // Atualizar o chat na lista (para ficar no topo)
      setChats((prevChats) => {
        const updatedChats = prevChats.filter(
          (chat) => chat._id !== activeChat._id
        );
        return [{ ...activeChat, updatedAt: new Date() }, ...updatedChats];
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    fetchMessages(chat._id);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleBackToList = () => {
    setActiveChat(null);
    setMessages([]);
  };

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return format(date, "HH:mm");
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), "dd/MM/yyyy", {
      locale: ptBR,
    });
  };

  const getChatName = (chat) => {
    if (!chat || !chat.firebaseUid) return "Chat";

    // Filtrar para obter os outros participantes (não o usuário atual)
    const otherParticipants = chat.firebaseUid.filter(
      (uid) => uid !== currentUser?.uid
    );

    if (otherParticipants.length === 0) return "Chat pessoal";

    // Mapear nomes dos participantes
    const participantNames = otherParticipants.map((uid) => {
      const profile = userProfiles[uid];
      if (!profile) return "Usuário";
      return profile.name || profile.businessName || "Usuário";
    });

    return participantNames.join(", ");
  };

  const getChatAvatar = (chat) => {
    if (!chat || !chat.firebaseUid) return null;

    // Obter o primeiro participante que não é o usuário atual
    const otherParticipant = chat.firebaseUid.find(
      (uid) => uid !== currentUser?.uid
    );

    if (!otherParticipant) return null;

    const profile = userProfiles[otherParticipant];
    if (!profile) return null;

    // Retornar cor baseada no tipo de usuário
    const userType = profile.type || "CUSTOMER";
    return USER_TYPES[userType] || USER_TYPES.CUSTOMER;
  };

  const getUserType = (uid) => {
    const profile = userProfiles[uid];
    if (!profile) return USER_TYPES.CUSTOMER;
    return USER_TYPES[profile.type] || USER_TYPES.CUSTOMER;
  };

  const renderChatList = () => {
    // Filtrar chats baseado na busca
    const filteredChats = chats.filter((chat) => {
      if (!searchQuery) return true;

      const searchLower = searchQuery.toLowerCase();
      const chatName = getChatName(chat).toLowerCase();

      return chatName.includes(searchLower);
    });

    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRight: isMobile ? "none" : `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Conversas
          </Typography>

          <TextField
            fullWidth
            placeholder="Buscar chat..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery("")}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: { borderRadius: 2 },
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredChats.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">
              {searchQuery
                ? "Nenhum chat encontrado"
                : "Nenhuma conversa iniciada"}
            </Typography>
          </Box>
        ) : (
          <List
            sx={{
              overflow: "auto",
              flexGrow: 1,
              px: 1,
              "& .MuiListItem-root": {
                borderRadius: 2,
                mb: 0.5,
                "&:hover": {
                  bgcolor: "rgba(0, 0, 0, 0.04)",
                },
              },
            }}
          >
            {filteredChats.map((chat) => {
              const chatAvatar = getChatAvatar(chat);
              const chatName = getChatName(chat);

              return (
                <ListItem
                  key={chat._id}
                  button
                  onClick={() => handleSelectChat(chat)}
                  selected={activeChat && activeChat._id === chat._id}
                  sx={{
                    bgcolor:
                      activeChat && activeChat._id === chat._id
                        ? `${chatAvatar?.lightColor || "#f5f5f5"}`
                        : "transparent",
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      badgeContent={
                        chat.unreadCount > 0 ? chat.unreadCount : null
                      }
                      color="error"
                      max={99}
                    >
                      <Avatar
                        sx={{
                          bgcolor: chatAvatar?.color || "primary.main",
                          color: "#fff",
                        }}
                      >
                        {chatAvatar?.icon || <PersonIcon />}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        noWrap
                        fontWeight={chat.unreadCount > 0 ? "bold" : "normal"}
                      >
                        {chatName}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        noWrap
                        sx={{
                          fontWeight: chat.unreadCount > 0 ? "bold" : "normal",
                        }}
                      >
                        {format(new Date(chat.updatedAt), "dd/MM HH:mm")}
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    );
  };

  const renderChatMessages = () => {
    if (!activeChat) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            bgcolor: "#fafafa",
          }}
        >
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Selecione um chat para começar
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Escolha uma conversa da lista à esquerda
            <br />
            ou inicie um novo atendimento
          </Typography>
        </Box>
      );
    }

    const chatAvatar = getChatAvatar(activeChat);
    const chatName = getChatName(activeChat);

    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Cabeçalho do chat */}
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: "flex",
            alignItems: "center",
            bgcolor: chatAvatar?.lightColor || "#f5f5f5",
          }}
        >
          {isMobile && (
            <IconButton edge="start" onClick={handleBackToList} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          )}

          <Avatar
            sx={{
              bgcolor: chatAvatar?.color || "primary.main",
              color: "#fff",
              mr: 1.5,
            }}
          >
            {chatAvatar?.icon || <PersonIcon />}
          </Avatar>

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              {chatName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {messageLoading
                ? "Carregando mensagens..."
                : messages.length > 0
                ? `${messages.length} mensagens`
                : "Conversa iniciada"}
            </Typography>
          </Box>

          <IconButton>
            <MoreVertIcon />
          </IconButton>
        </Box>

        {/* Área de mensagens */}
        <Box
          sx={{
            flexGrow: 1,
            p: 2,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            bgcolor: "#f5f5f5",
          }}
        >
          {messageLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <Typography color="text.secondary">
                Nenhuma mensagem ainda. Inicie a conversa!
              </Typography>
            </Box>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isCurrentUser = msg.sender === currentUser?.uid;
                const userType = getUserType(msg.sender);
                const previousMsg = index > 0 ? messages[index - 1] : null;
                const showSenderInfo =
                  !previousMsg || previousMsg.sender !== msg.sender;

                // Verificar se é um novo dia
                const isNewDay =
                  index === 0 ||
                  new Date(msg.createdAt).toDateString() !==
                    new Date(previousMsg.createdAt).toDateString();

                return (
                  <React.Fragment key={msg._id || index}>
                    {isNewDay && (
                      <Box
                        sx={{
                          textAlign: "center",
                          my: 2,
                          position: "relative",
                        }}
                      >
                        <Divider sx={{ mb: 1 }} />
                        <Chip
                          label={formatDate(msg.createdAt)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    )}

                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isCurrentUser ? "flex-end" : "flex-start",
                        mb: 1,
                      }}
                    >
                      {showSenderInfo && !isCurrentUser && (
                        <Typography
                          variant="caption"
                          sx={{
                            ml: 1.5,
                            mb: 0.5,
                            color: userType.color,
                          }}
                        >
                          {userProfiles[msg.sender]?.name ||
                            userProfiles[msg.sender]?.businessName ||
                            "Usuário"}
                        </Typography>
                      )}

                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isCurrentUser ? "flex-end" : "flex-start",
                          mb: 2, // Aumenta o espaço entre grupos de mensagens
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            px: 2,
                            borderRadius: 2,
                            ml: !isCurrentUser && !showSenderInfo ? 3.5 : 0,
                            bgcolor: isCurrentUser
                              ? USER_TYPES.SUPPORT.color // Vermelho do Gringo para mensagens do suporte (usuário atual)
                              : USER_TYPES.MOTOBOY.color, // Branco para mensagens de outros usuários
                            color: "#fff",
                            borderTopRightRadius: isCurrentUser ? 4 : 20,
                            borderTopLeftRadius: !isCurrentUser ? 4 : 20,
                          }}
                        >
                          <Typography
                            variant="body1"
                            sx={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {msg.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              mt: 0.5,
                              display: "block",
                              textAlign: "right",
                              opacity: 0.8,
                            }}
                          >
                            {formatTime(msg.createdAt)}
                            {msg.read && isCurrentUser && (
                              <CheckCircleOutlineIcon
                                sx={{ ml: 0.5, fontSize: 12 }}
                              />
                            )}
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </Box>

        {/* Área de digitação */}
        <Box
          component="form"
          onSubmit={handleSendMessage}
          sx={{
            p: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            bgcolor: "#fff",
          }}
        >
          <Grid
            container
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
          >
            <Grid item xs width={"90%"}>
              <TextField
                fullWidth
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                variant="outlined"
                multiline
                maxRows={4}
                disabled={sendingMessage}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 4,
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton color="primary" disabled>
                        <EmojiIcon />
                      </IconButton>
                      <IconButton color="primary" disabled>
                        <AttachFileIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                sx={{ borderRadius: "50%", minWidth: "auto", p: 1.5 }}
              >
                {sendingMessage ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <SendIcon />
                )}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* Barra superior para dispositivos móveis */}
      {isMobile && (
        <AppBar position="static" color="primary">
          <Toolbar>
            {!activeChat && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={toggleDrawer(true)}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
              {activeChat ? getChatName(activeChat) : "Chats"}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Layout principal */}
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        {/* Lista de chats para desktop ou drawer para mobile */}
        {isMobile ? (
          <Drawer
            open={drawerOpen}
            onClose={toggleDrawer(false)}
            sx={{
              width: 320,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: 320,
              },
            }}
          >
            {renderChatList()}
          </Drawer>
        ) : (
          <Box sx={{ width: 320, flexShrink: 0 }}>{renderChatList()}</Box>
        )}

        {/* Área de mensagens */}
        <Box sx={{ flexGrow: 1 }}>{renderChatMessages()}</Box>
      </Box>
    </Box>
  );
};

export default ChatPage;
