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
  ListItemIcon,
  Drawer,
  Modal,
  Backdrop,
  Snackbar,
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
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  ShoppingBag as ProductsIcon,
  Logout as LogoutIcon,
  ReportProblem as OcorrenciasIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import eventService from "../../services/eventService";
import { useNavigate, Link } from "react-router-dom";

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

  // Estados para upload de arquivos
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Estado para o preview da imagem em tela cheia
  const [previewImage, setPreviewImage] = useState(null);

  // Estado para o snackbar de feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Função para toggle do drawer
  const toggleDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDrawerOpen(open);
  };

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

  // Função para lidar com seleção de arquivos
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tamanho do arquivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("Arquivo muito grande. Máximo permitido: 10MB");
      return;
    }

    // Validar tipos de arquivo permitidos
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(
        "Tipo de arquivo não permitido. Permitidos: imagens, PDF, DOC, DOCX, XLS, XLSX, TXT"
      );
      return;
    }

    setSelectedFile(file);

    // Criar preview para imagens
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  // Função para fazer upload do arquivo
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", activeChat._id);
    formData.append("sender", user.uid);

    try {
      const response = await api.post("/chat/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Erro no upload:", error);
      throw error;
    }
  };

  // Função para enviar arquivo
  const handleSendFile = async () => {
    if (!selectedFile || !activeChat || !user) return;

    try {
      setUploadingFile(true);

      // Fazer upload do arquivo
      const uploadResponse = await uploadFile(selectedFile);

      // Criar mensagem com o arquivo
      const messageData = {
        chatId: activeChat._id,
        message: `Arquivo: ${selectedFile.name}`,
        sender: user.uid,
        messageType: "FILE",
        fileUrl: uploadResponse.fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
      };

      const response = await api.post("/chat/message", messageData);

      // Enviar notificação para os outros participantes
      const otherParticipants = activeChat.firebaseUid.filter(
        (uid) => uid !== user.uid
      );

      if (otherParticipants.length > 0) {
        await api.post(`/notifications/generic`, {
          title: "Nova mensagem",
          message: `📎 Enviou um arquivo: ${selectedFile.name}`,
          firebaseUid: otherParticipants,
          screen: "/chat",
          type: "CHAT_MESSAGE",
          chatId: activeChat._id,
          expiresAt: new Date(Date.now() + 16 * 60 * 60 * 1000),
        });
      }

      // Adicionar mensagem à lista local
      setMessages((prev) => [...prev, response.data]);

      // Limpar estados
      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error);
      alert("Erro ao enviar arquivo. Tente novamente.");
    } finally {
      setUploadingFile(false);
    }
  };

  // Função para cancelar seleção de arquivo
  const handleCancelFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();

    // Se há arquivo selecionado, enviar arquivo em vez de mensagem de texto
    if (selectedFile) {
      await handleSendFile();
      return;
    }

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

  // Componente do drawer de navegação
  const drawerItems = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <img
          src="https://i.imgur.com/8jOdfcO.png"
          alt="Gringo Delivery"
          style={{ height: 50, marginBottom: 16 }}
        />
      </Box>
      <Divider />
      <List>
        <ListItem
          button
          component={Link}
          to="/dashboard"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/produtos"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <ProductsIcon />
          </ListItemIcon>
          <ListItemText primary="Produtos" />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/pedidos"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <OrdersIcon />
          </ListItemIcon>
          <ListItemText primary="Pedidos" />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/ocorrencias"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <OcorrenciasIcon />
          </ListItemIcon>
          <ListItemText primary="Ocorrências" />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/chat"
          selected={true}
          sx={{
            color: "text.primary",
            "&.Mui-selected": {
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
            },
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <ChatIcon />
          </ListItemIcon>
          <ListItemText primary="Chat" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem
          button
          onClick={handleLogout}
          sx={{ "&:hover": { bgcolor: "error.light", color: "white" } }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Sair" />
        </ListItem>
      </List>
    </Box>
  );

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
                        {/* Renderização baseada no tipo de mensagem */}
                        {msg.messageType === "FILE" ? (
                          <Box>
                            {/* Preview da imagem se for imagem */}
                            {(
                              msg.metadata?.fileType || msg.fileType
                            )?.startsWith("image/") &&
                            (msg.metadata?.fileUrl || msg.fileUrl) ? (
                              <Box sx={{ mb: 1 }}>
                                <img
                                  src={msg.metadata?.fileUrl || msg.fileUrl}
                                  alt={msg.metadata?.fileName || msg.fileName}
                                  style={{
                                    maxWidth: "200px",
                                    maxHeight: "200px",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    display: "block",
                                  }}
                                  onClick={() =>
                                    setPreviewImage(
                                      msg.metadata?.fileUrl || msg.fileUrl
                                    )
                                  }
                                  onError={(e) => {
                                    console.error(
                                      "Erro ao carregar imagem:",
                                      msg.metadata?.fileUrl || msg.fileUrl
                                    );
                                    e.target.style.display = "none";
                                  }}
                                  onLoad={() => {
                                    console.log(
                                      "Imagem carregada com sucesso:",
                                      msg.metadata?.fileUrl || msg.fileUrl
                                    );
                                  }}
                                />
                              </Box>
                            ) : null}

                            {/* Informações do arquivo */}
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              {(
                                msg.metadata?.fileType || msg.fileType
                              )?.startsWith("image/") ? (
                                <ImageIcon sx={{ fontSize: 20 }} />
                              ) : (
                                <FileIcon sx={{ fontSize: 20 }} />
                              )}
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                    "&:hover": { opacity: 0.8 },
                                  }}
                                  onClick={() => {
                                    console.log(
                                      "Tentando abrir arquivo:",
                                      msg.metadata?.fileUrl || msg.fileUrl
                                    );
                                    window.open(
                                      msg.metadata?.fileUrl || msg.fileUrl,
                                      "_blank"
                                    );
                                  }}
                                >
                                  {msg.metadata?.fileName || msg.fileName}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ opacity: 0.7 }}
                                >
                                  {msg.metadata?.fileSize || msg.fileSize
                                    ? `${(
                                        (msg.metadata?.fileSize ||
                                          msg.fileSize) / 1024
                                      ).toFixed(1)} KB`
                                    : ""}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{ wordBreak: "break-word" }}
                          >
                            {msg.message}
                          </Typography>
                        )}
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
          {/* Preview do arquivo selecionado */}
          {filePreview && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                bgcolor: "#f5f5f5",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {selectedFile?.type?.startsWith("image/") ? (
                    <ImageIcon color="primary" />
                  ) : (
                    <FileIcon color="primary" />
                  )}
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedFile?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedFile?.size
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                        : ""}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={handleCancelFile}
                  disabled={uploadingFile}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Preview da imagem */}
              {selectedFile?.type?.startsWith("image/") && filePreview && (
                <Box sx={{ mt: 2 }}>
                  <img
                    src={filePreview}
                    alt="Preview"
                    style={{
                      maxWidth: "200px",
                      maxHeight: "200px",
                      borderRadius: "8px",
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <TextField
              fullWidth
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              variant="outlined"
              multiline
              maxRows={4}
              disabled={sendingMessage || uploadingFile}
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
                    <input
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      style={{ display: "none" }}
                      id="file-input"
                      type="file"
                      onChange={handleFileSelect}
                    />
                    <label htmlFor="file-input">
                      <IconButton
                        color="primary"
                        component="span"
                        disabled={uploadingFile}
                      >
                        <AttachFileIcon />
                      </IconButton>
                    </label>
                  </InputAdornment>
                ),
              }}
            />
            {uploadingFile ? (
              <Box sx={{ ml: 1, display: "flex", alignItems: "center" }}>
                <CircularProgress size={24} />
              </Box>
            ) : selectedFile ? (
              <Button
                variant="contained"
                onClick={handleSendFile}
                disabled={uploadingFile}
                sx={{ borderRadius: "50%", minWidth: "auto", p: 1.5, ml: 1 }}
              >
                <SendIcon />
              </Button>
            ) : (
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
            )}
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
        <AppBar position="fixed">
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleDrawer(true)}
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

      {/* Drawer para dispositivos móveis */}
      <Drawer
        anchor="left"
        open={isMobile ? drawerOpen : true}
        onClose={toggleDrawer(false)}
        variant={isMobile ? "temporary" : "permanent"}
        sx={{
          width: 250,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 250,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerItems}
      </Drawer>

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

        {/* Modal para preview de imagem */}
        <Modal
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <Box
            sx={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}
          >
            <IconButton
              onClick={() => setPreviewImage(null)}
              sx={{
                position: "absolute",
                top: -10,
                right: -10,
                bgcolor: "rgba(0, 0, 0, 0.5)",
                color: "white",
                "&:hover": {
                  bgcolor: "rgba(0, 0, 0, 0.7)",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  borderRadius: "8px",
                }}
                onError={(e) => {
                  console.error(
                    "Erro ao carregar imagem no modal:",
                    previewImage
                  );
                  setPreviewImage(null);
                }}
              />
            )}
          </Box>
        </Modal>

        {/* Snackbar para feedback */}
        <Snackbar
          open={Boolean(snackbar.open)}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
