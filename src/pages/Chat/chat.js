import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Paper,
  Divider,
  IconButton,
  Badge,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Support as SupportIcon,
  Person as PersonIcon,
  Chat as ChatIcon,
  Add as AddIcon,
  EmojiEmotions as EmojiIcon,
  AttachFile as AttachFileIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Headset as HeadsetIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as OrdersIcon,
  ShoppingBag as ProductsIcon,
  Logout as LogoutIcon,
  ReportProblem as OcorrenciasIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import eventService from "../../services/eventService";
import { useNavigate } from "react-router-dom";
import SideDrawer from "../../components/SideDrawer/SideDrawer";

export default function ChatStore() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const activeChatRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const [createChatDialog, setCreateChatDialog] = useState(false);
  const messagesEndRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Carregar chats do usuário
  useEffect(() => {
    if (user?.uid) {
      loadChats();
    }
  }, [user]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Configurar SSE
  useEffect(() => {
    if (!user?.uid) {
      console.log("❌ Usuário não encontrado, não conectando SSE");
      return;
    }

    console.log("🔌 Conectando SSE para usuário:", user.uid);
    eventService.connect(user?.uid);

    // Configurar listeners
    eventService.on("CHAT_MESSAGE", (data) => {
      console.log("📩 Mensagem recebida via SSE:", data);

      // Verificar se a mensagem é do chat ativo
      if (data.chatId === activeChatRef.current?._id) {
        setMessages((prev) => [...prev, data.message]);
      }

      // Atualizar o chat na lista local
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat._id === data.chatId) {
            const isActiveChat = chat._id === activeChatRef.current?._id;
            return {
              ...chat,
              lastMessage: data.message,
              unreadCount: isActiveChat ? 0 : (chat.unreadCount || 0) + 1,
              updatedAt: new Date(),
            };
          }
          return chat;
        });
      });
    });

    return () => {
      eventService.off("CHAT_MESSAGE");
    };
  }, [user]);

  // Carregar mensagens quando um chat é selecionado
  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat._id);
      markMessagesAsRead(activeChat._id);
    }
  }, [activeChat]);

  // Auto scroll para última mensagem
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadUserProfile = async (firebaseUid) => {
    if (
      userProfiles[firebaseUid] ||
      firebaseUid === user.uid ||
      firebaseUid === "support"
    ) {
      return;
    }

    try {
      const response = await api.get(`/stores/firebase/${firebaseUid}`);
      setUserProfiles((prev) => ({
        ...prev,
        [firebaseUid]: response.data,
      }));
    } catch (error) {
      console.error(`Erro ao buscar perfil do usuário ${firebaseUid}:`, error);
      setUserProfiles((prev) => ({
        ...prev,
        [firebaseUid]: { name: `Usuário ${firebaseUid.substring(0, 6)}` },
      }));
    }
  };

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/chat/user/${user.uid}`);
      const filteredChats = response.data.filter(
        (chat) => chat.status === "ACTIVE"
      );
      setChats(filteredChats);

      // Carregar perfis dos usuários
      const uniqueUserIds = new Set();
      for (const chat of filteredChats) {
        for (const uid of chat.firebaseUid) {
          if (uid !== user.uid && uid !== "support" && !userProfiles[uid]) {
            uniqueUserIds.add(uid);
          }
        }
      }

      const promises = Array.from(uniqueUserIds)
        .slice(0, 5)
        .map((uid) => loadUserProfile(uid).catch(() => {}));

      await Promise.all(promises);
    } catch (error) {
      console.error("Erro ao carregar chats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMessages = async (chatId) => {
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

  const markMessagesAsRead = async (chatId) => {
    try {
      //await api.put(`/chat/message/${chatId}/read/${user.uid}`); // TODO adicionar mensagem marcada como lida
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
        )
      );
    } catch (error) {
      console.error("Erro ao marcar mensagens como lidas:", error);
    }
  };

  const getParticipantName = (chat, uid) => {
    if (chat.participantNames && chat.participantNames[uid]) {
      return chat.participantNames[uid];
    }

    const participant = chat.participants?.find((p) => p.firebaseUid === uid);
    if (participant && participant.name) {
      return participant.name;
    }

    if (userProfiles[uid]) {
      return userProfiles[uid].name || userProfiles[uid].businessName;
    }

    if (uid === "support" || chat.chatType === "SUPPORT") {
      return "Suporte Gringo";
    }

    return `Usuário ${uid?.substring(0, 6) || "Desconhecido"}`;
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeChat || !user) return;

    try {
      setSendingMessage(true);

      const messageData = {
        chatId: activeChat._id,
        message: newMessage.trim(),
        sender: user.uid,
      };

      const response = await api.post("/chat/message", messageData);

      // Enviar notificação
      await api.post(`/notifications/generic`, {
        title: "Nova mensagem",
        message: newMessage.trim(),
        firebaseUid: activeChat.firebaseUid.filter((uid) => uid !== user.uid),
        screen: "/chat",
        type: "CHAT_MESSAGE",
        chatId: activeChat._id,
        expiresAt: new Date(Date.now() + 16 * 60 * 60 * 1000),
      });

      setMessages((prev) => [...prev, response.data]);
      setNewMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateSupportChat = async () => {
    const supportChat = chats.find(
      (chat) =>
        chat.firebaseUid.includes(user.uid) &&
        chat.firebaseUid.includes("support")
    );

    if (supportChat) {
      setActiveChat(supportChat);
      setCreateChatDialog(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/chat", {
        firebaseUid: [user.uid, "support"],
      });

      setChats((prev) => [response.data, ...prev]);
      setActiveChat(response.data);
      setCreateChatDialog(false);
    } catch (error) {
      console.error("Erro ao criar chat com o suporte:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatMessageDate = (dateString) => {
    if (!dateString) return "";

    try {
      const messageDate = new Date(dateString);
      if (isNaN(messageDate.getTime())) return "";

      const today = new Date();
      const isToday =
        messageDate.getDate() === today.getDate() &&
        messageDate.getMonth() === today.getMonth() &&
        messageDate.getFullYear() === today.getFullYear();

      return format(messageDate, isToday ? "HH:mm" : "dd/MM/yyyy HH:mm", {
        locale: ptBR,
      });
    } catch (error) {
      return "";
    }
  };

  const handleBackToList = () => {
    setActiveChat(null);
  };

  // Fazer logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // Definir itens de menu para o SideDrawer
  const menuItems = [
    { path: "/dashboard", text: "Dashboard", icon: <DashboardIcon /> },
    { path: "/produtos", text: "Produtos", icon: <ProductsIcon /> },
    { path: "/pedidos", text: "Pedidos", icon: <OrdersIcon /> },
    { path: "/ocorrencias", text: "Ocorrências", icon: <OcorrenciasIcon /> },
    { path: "/chat", text: "Chat", icon: <ChatIcon /> },
  ];

  // Definir itens de rodapé para o SideDrawer
  const footerItems = [
    {
      text: "Sair",
      icon: <LogoutIcon />,
      onClick: handleLogout,
      color: "error",
    },
  ];

  const renderChatList = () => {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRight: isMobile ? "none" : `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Header da lista */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Conversas
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateChatDialog(true)}
            fullWidth
            sx={{ mb: 1 }}
          >
            Nova Conversa
          </Button>
          <Button
            variant="text"
            startIcon={<RefreshIcon />}
            onClick={() => {
              setRefreshing(true);
              loadChats();
            }}
            disabled={refreshing}
            size="small"
          >
            Atualizar
          </Button>
        </Box>

        {/* Lista de chats */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : chats.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <ChatIcon sx={{ fontSize: 64, color: "grey.300", mb: 2 }} />
            <Typography color="text.secondary" gutterBottom>
              Nenhuma conversa encontrada
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateChatDialog(true)}
              sx={{ mt: 2 }}
            >
              Iniciar Conversa
            </Button>
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
            {chats.map((chat) => {
              const otherUserId = chat.firebaseUid.find(
                (uid) => uid !== user.uid
              );
              const chatName = getParticipantName(chat, otherUserId);
              const isSupport =
                chat.chatType === "SUPPORT" || otherUserId === "support";
              const isActive = activeChat && activeChat._id === chat._id;

              const chatAvatar = isSupport
                ? {
                    icon: <HeadsetIcon />,
                    color: "#4caf50",
                    lightColor: "#e8f5e8",
                  }
                : {
                    icon: <PersonIcon />,
                    color: "#2196f3",
                    lightColor: "#e3f2fd",
                  };

              return (
                <ListItem
                  key={chat._id}
                  button
                  onClick={() => setActiveChat(chat)}
                  sx={{
                    bgcolor: isActive ? "primary.light" : "transparent",
                    color: isActive ? "primary.contrastText" : "inherit",
                    "&:hover": {
                      bgcolor: isActive
                        ? "primary.main"
                        : "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={
                        chat.unreadCount > 0 ? chat.unreadCount : null
                      }
                      color="error"
                      max={99}
                    >
                      <Avatar
                        sx={{
                          bgcolor: chatAvatar.color,
                          color: "#fff",
                        }}
                      >
                        {chatAvatar.icon}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle1"
                        fontWeight={chat.unreadCount > 0 ? "bold" : "normal"}
                        noWrap
                      >
                        {chatName}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {chat.lastMessage?.text
                          ? chat.lastMessage.text.length > 40
                            ? `${chat.lastMessage.text.substring(0, 40)}...`
                            : chat.lastMessage.text
                          : chat.updatedAt
                          ? formatMessageDate(chat.updatedAt)
                          : "Chat criado"}
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
    const otherUserId = activeChat?.firebaseUid.find((uid) => uid !== user.uid);
    const chatName = activeChat
      ? getParticipantName(activeChat, otherUserId)
      : "";
    const isSupport =
      activeChat?.chatType === "SUPPORT" || otherUserId === "support";

    const chatAvatar = isSupport
      ? { icon: <HeadsetIcon />, color: "#4caf50", lightColor: "#e8f5e8" }
      : { icon: <PersonIcon />, color: "#2196f3", lightColor: "#e3f2fd" };

    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header do chat */}
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
                const isCurrentUser = msg.sender === user.uid;
                const showDate =
                  index === 0 ||
                  formatMessageDate(msg.createdAt) !==
                    formatMessageDate(messages[index - 1]?.createdAt);

                return (
                  <Box key={msg._id}>
                    {showDate && (
                      <Box sx={{ textAlign: "center", my: 2 }}>
                        <Chip
                          label={formatMessageDate(msg.createdAt)}
                          size="small"
                          sx={{ bgcolor: "rgba(0,0,0,0.1)" }}
                        />
                      </Box>
                    )}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: isCurrentUser
                          ? "flex-end"
                          : "flex-start",
                        mb: 1,
                      }}
                    >
                      <Paper
                        sx={{
                          p: 1.5,
                          maxWidth: "70%",
                          bgcolor: isCurrentUser ? "primary.main" : "#fff",
                          color: isCurrentUser ? "#fff" : "text.primary",
                          borderRadius: 2,
                          borderBottomLeftRadius: isCurrentUser ? 2 : 0.5,
                          borderBottomRightRadius: isCurrentUser ? 0.5 : 2,
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ wordBreak: "break-word" }}
                        >
                          {msg.message}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            mt: 0.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: isCurrentUser
                                ? "rgba(255,255,255,0.7)"
                                : "text.secondary",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {format(new Date(msg.createdAt), "HH:mm", {
                              locale: ptBR,
                            })}
                            {isCurrentUser && msg.read && (
                              <CheckCircleIcon sx={{ ml: 0.5, fontSize: 14 }} />
                            )}
                          </Typography>
                        </Box>
                      </Paper>
                    </Box>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </Box>

        {/* Input de mensagem */}
        <Box
          component="form"
          onSubmit={handleSendMessage}
          sx={{
            p: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            bgcolor: "#fff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
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
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendingMessage}
              sx={{ borderRadius: "50%", minWidth: "auto", p: 1.5, ml: 1 }}
            >
              {sendingMessage ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <SendIcon />
              )}
            </Button>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderNoActiveChat = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        bgcolor: "#f5f5f5",
        p: 4,
      }}
    >
      <ChatIcon sx={{ fontSize: 80, color: "grey.300", mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Selecione uma conversa
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Escolha uma conversa para começar a conversar
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setCreateChatDialog(true)}
      >
        Nova Conversa
      </Button>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* AppBar para dispositivos móveis */}
      {isMobile && (
        <AppBar position="fixed" sx={{ bgcolor: "primary.main" }}>
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, fontWeight: "bold" }}
            >
              Gringo Delivery
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* SideDrawer */}
      {isMobile ? (
        <SideDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          variant="temporary"
          title="Gringo Delivery"
          logoUrl="https://i.imgur.com/8jOdfcO.png"
          logoAlt="Gringo Delivery"
          logoHeight={50}
          menuItems={menuItems}
          footerItems={footerItems}
        />
      ) : (
        <SideDrawer
          open={true}
          variant="permanent"
          title="Gringo Delivery"
          logoUrl="https://i.imgur.com/8jOdfcO.png"
          logoAlt="Gringo Delivery"
          logoHeight={50}
          menuItems={menuItems}
          footerItems={footerItems}
        />
      )}

      {/* Conteúdo principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: isMobile ? 0 : "2px",
          mt: isMobile ? "64px" : 0,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        <Paper
          sx={{
            height: "calc(100vh - 48px)",
            display: "flex",
            overflow: "hidden",
            flexGrow: 1,
          }}
        >
          {/* Lista de chats - sempre visível em desktop, condicional em mobile */}
          <Box
            sx={{
              width: isMobile ? (activeChat ? 0 : "100%") : 350,
              display: isMobile && activeChat ? "none" : "block",
              flexShrink: 0,
            }}
          >
            {renderChatList()}
          </Box>

          {/* Área de mensagens */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {activeChat ? renderChatMessages() : renderNoActiveChat()}
          </Box>
        </Paper>

        {/* FAB para mobile */}
        {isMobile && !activeChat && (
          <Fab
            color="primary"
            onClick={() => setCreateChatDialog(true)}
            sx={{ position: "fixed", bottom: 20, right: 20 }}
          >
            <AddIcon />
          </Fab>
        )}

        {/* Dialog para criar nova conversa */}
        <Dialog
          open={createChatDialog}
          onClose={() => setCreateChatDialog(false)}
        >
          <DialogTitle>Nova Conversa</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Por enquanto, você só pode iniciar conversas com o suporte.
            </Alert>
            <Typography variant="body1">
              Deseja iniciar uma conversa com nossa equipe de suporte?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateChatDialog(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={() => navigate("/ocorrencias")}
              startIcon={<HeadsetIcon />}
            >
              Criar ocorrência com Suporte
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
