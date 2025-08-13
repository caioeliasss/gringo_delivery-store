import React, { useState, useEffect, useRef, use } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  ListItemButton,
  Fab,
  Modal,
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
  Image as ImageIcon,
  Description as FileIcon,
  CloudUpload as UploadIcon,
  NotificationsOff as NotificationsOffIcon,
  Delete as DeleteIcon,
  Dashboard as DashboardIcon,
  ShoppingBag as ProductsIcon,
  Receipt as OrdersIcon,
  Person as ProfileIcon,
  Logout as LogoutIcon,
  ShoppingBag,
  Report as ReportProblemIcon,
  Map as MapIcon,
  ReportProblem as OcorrenciasIcon,
  Chat as ChatIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import eventService from "../../services/eventService";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import {
  SUPPORT_MENU_ITEMS,
  createSupportFooterItems,
} from "../../config/menuConfig";

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
  const { currentUser, logout } = useAuth();
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

  // Estados para criar novo chat
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [newChatType, setNewChatType] = useState(""); // "MOTOBOY" ou "STORE"
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Estados para upload de arquivos
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Estado para o preview da imagem em tela cheia
  const [previewImage, setPreviewImage] = useState(null);

  // Efeito para verificar se o usuário está autenticado como suporte

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

  //Marca as mensagens como lidas quando o chat está ativo
  useEffect(() => {
    if (activeChat) {
      markMessagesAsRead();
    }
  }, [activeChat]); // Remova messages das dependências

  // Substitua o useEffect do SSE (linhas 142-202) por esta versão:

  useEffect(() => {
    if (!currentUser?.uid) {
      console.log("❌ Usuário não encontrado, não conectando SSE");
      return;
    }

    console.log("🔌 Conectando SSE para usuário:", currentUser.uid);
    eventService.connect(currentUser?.uid);

    eventService.on("CHAT_MESSAGE", (data) => {
      // Verificar se temos os dados necessários
      if (!data.message || !data.chatId) {
        console.error("❌ Dados SSE incompletos:", data);
        return;
      }

      // Construir o objeto da mensagem baseado no que temos
      const newMessage = {
        _id: `sse-${Date.now()}-${Math.random()}`, // ID temporário único
        message: data.message, // O texto da mensagem
        sender: data.sender || "unknown", // Remetente
        createdAt: new Date().toISOString(), // Timestamp atual
        messageType: "TEXT",
        readBy: [], // Array vazio inicialmente
      };

      console.log("📝 Mensagem construída:", newMessage);

      if (data.chatId === activeChat?._id) {
        // console.log("✅ Mensagem para o chat ativo - adicionando diretamente");

        // Se a mensagem é do chat ativo, adiciona diretamente
        setMessages((prevMessages) => {
          // Verificar se a mensagem já existe para evitar duplicatas
          const messageExists = prevMessages.some(
            (msg) =>
              msg.message === data.message &&
              msg.sender === (data.sender || "unknown") &&
              Math.abs(new Date(msg.createdAt) - new Date()) < 5000 // Dentro de 5 segundos
          );

          if (messageExists) {
            console.log("⚠️ Mensagem já existe - não duplicando");
            return prevMessages;
          }

          console.log("✅ Adicionando nova mensagem ao chat ativo");
          return [...prevMessages, newMessage];
        });

        // Atualizar também o chat na lista
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat._id === data.chatId
              ? {
                  ...chat,
                  lastMessage: {
                    text: data.message,
                    sender: data.sender || "unknown",
                    timestamp: new Date(),
                  },
                  updatedAt: new Date(),
                }
              : chat
          )
        );

        // Rolar para o final
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        // Se não é do chat ativo, atualiza a lista de chats
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat._id === data.chatId
              ? {
                  ...chat,
                  unreadCount: (chat.unreadCount || 0) + 1,
                  lastMessage: {
                    text: data.message,
                    sender: data.sender || "unknown",
                    timestamp: new Date(),
                  },
                  updatedAt: new Date(),
                }
              : chat
          )
        );
      }
    });

    // Limpar listeners ao desmontar
    return () => {
      console.log("🧹 Limpando listeners SSE");
      eventService.off("CHAT_MESSAGE");
    };
  }, [currentUser, activeChat]); // Manter activeChat nas dependências

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      alert("Erro ao fazer logout. Tente novamente.");
    }
  };

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

      const chatsWithUnread = chatData.map((chat) => {
        const userParticipant = chat.participants?.find(
          (p) => p.firebaseUid === currentUser.uid
        );

        return {
          ...chat,
          unreadCount: userParticipant?.unreadCount || 0,
        };
      });

      setChats(chatsWithUnread);

      // Agora usar os nomes já gravados no banco
      const profiles = {};
      chatData.forEach((chat) => {
        if (chat.participantNames) {
          // Converter Map para objeto se necessário
          const names =
            chat.participantNames instanceof Map
              ? Object.fromEntries(chat.participantNames)
              : chat.participantNames;

          Object.entries(names).forEach(([uid, name]) => {
            if (!profiles[uid]) {
              profiles[uid] = { name: name };
            }
          });
        }

        // Também usar dados dos participants
        chat.participants?.forEach((participant) => {
          if (participant.name && !profiles[participant.firebaseUid]) {
            profiles[participant.firebaseUid] = { name: participant.name };
          }
        });
      });

      setUserProfiles(profiles);

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
      try {
        const supportResponse = await api.get(`/admin/firebase/${uid}`);
        if (supportResponse.data) {
          setUserProfiles((prev) => ({
            ...prev,
            [uid]: {
              ...supportResponse.data,
              type: "ADMIN",
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

  // Função para obter o nome do participante
  const getParticipantName = (chat, uid) => {
    // Primeiro tentar nos nomes gravados
    if (chat.participantNames && chat.participantNames[uid]) {
      return chat.participantNames[uid];
    }

    // Depois tentar nos participants
    const participant = chat.participants?.find((p) => p.firebaseUid === uid);
    if (participant && participant.name) {
      return participant.name;
    }

    // Fallback para userProfiles
    if (userProfiles[uid]) {
      return userProfiles[uid].name || userProfiles[uid].businessName;
    }

    // Nome padrão
    return uid === "support"
      ? "Suporte Gringo"
      : `Usuário ${uid.substring(0, 6)}`;
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

  const handleChatStatus = async (status) => {
    if (!activeChat || !currentUser) return;

    try {
      await api.put(`/chat/${activeChat._id}/status`, {
        status,
        updatedBy: currentUser.uid,
      });
      // Atualizar o chat na lista localmente
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat._id === activeChat._id
            ? {
                ...chat,
                status,
                updatedAt: new Date(),
              }
            : chat
        )
      );
      // Atualizar o chat ativo
      setActiveChat((prev) => ({
        ...prev,
        status,
        updatedAt: new Date(),
      }));
    } catch (error) {
      console.error("Erro ao atualizar status do chat:", error);
    }
  };

  // Marcar mensagens como lidas
  const markMessagesAsRead = async () => {
    if (!activeChat || !currentUser) return;

    // Verificar primeiro se há mensagens não lidas
    const hasUnread =
      activeChat.unreadCount > 0 ||
      messages.some(
        (msg) =>
          msg.sender !== currentUser.uid &&
          !msg.readBy?.some((read) => read.firebaseUid === currentUser.uid)
      );

    // Se não houver mensagens não lidas, não faz nada
    if (!hasUnread) return;

    try {
      await api.put(`/chat/message/${activeChat._id}/read/${currentUser.uid}`);

      // Atualizar contagem de não lidas no estado local
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat._id === activeChat._id
            ? {
                ...chat,
                unreadCount: 0,
                participants: chat.participants?.map((p) =>
                  p.firebaseUid === currentUser.uid
                    ? { ...p, unreadCount: 0 }
                    : p
                ),
              }
            : chat
        )
      );

      // Atualizar as mensagens localmente também
      setMessages((prev) => {
        // Verificar se há alguma alteração a ser feita
        const needsUpdate = prev.some(
          (msg) =>
            msg.sender !== currentUser.uid &&
            !msg.readBy?.some((read) => read.firebaseUid === currentUser.uid)
        );

        // Se não houver alterações necessárias, retorna o array original
        if (!needsUpdate) return prev;

        // Caso contrário, atualiza as mensagens
        return prev.map((msg) => {
          if (
            msg.sender !== currentUser.uid &&
            !msg.readBy?.some((read) => read.firebaseUid === currentUser.uid)
          ) {
            return {
              ...msg,
              readBy: [
                ...(msg.readBy || []),
                {
                  firebaseUid: currentUser.uid,
                  readAt: new Date(),
                },
              ],
            };
          }
          return msg;
        });
      });
    } catch (error) {
      console.error("Erro ao marcar mensagens como lidas:", error);
    }
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
    formData.append("sender", currentUser.uid);

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
    if (!selectedFile || !activeChat || !currentUser) return;

    try {
      setUploadingFile(true);

      // Fazer upload do arquivo
      const uploadResponse = await uploadFile(selectedFile);

      // Criar mensagem com o arquivo
      const messageData = {
        chatId: activeChat._id,
        message: `Arquivo: ${selectedFile.name}`,
        sender: currentUser.uid,
        messageType: "FILE",
        fileUrl: uploadResponse.fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
      };

      const response = await api.post("/chat/message", messageData);

      // Obter o nome do remetente para notificação
      const senderName = getParticipantName(activeChat, currentUser.uid);

      // Enviar notificação para os outros participantes
      const otherParticipants = activeChat.firebaseUid.filter(
        (uid) => uid !== currentUser.uid
      );

      // Adicionar mensagem à lista local
      setMessages((prev) => [...prev, response.data]);

      // Limpar estados
      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Atualizar o chat na lista
      setChats((prevChats) => {
        const updatedChats = prevChats.filter(
          (chat) => chat._id !== activeChat._id
        );

        const updatedChat = {
          ...activeChat,
          lastMessage: {
            text: `📎 ${selectedFile.name}`,
            sender: currentUser.uid,
            timestamp: new Date(),
          },
          updatedAt: new Date(),
        };

        return [updatedChat, ...updatedChats];
      });
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

  // Enviar nova mensagem
  const handleSendMessage = async (e) => {
    e?.preventDefault();

    // Se há arquivo selecionado, enviar arquivo em vez de mensagem de texto
    if (selectedFile) {
      await handleSendFile();
      return;
    }

    if (!newMessage.trim() || !activeChat || !currentUser) return;

    try {
      setSendingMessage(true);

      const messageData = {
        chatId: activeChat._id,
        message: newMessage.trim(),
        sender: currentUser.uid,
        messageType: "TEXT",
      };

      const response = await api.post("/chat/message", messageData);

      // Obter o nome do remetente para usar como título da notificação
      const senderName = getParticipantName(activeChat, currentUser.uid);

      // Enviar notificação para os outros participantes
      const otherParticipants = activeChat.firebaseUid.filter(
        (uid) => uid !== currentUser.uid
      );

      // Adicionar mensagem à lista local
      setMessages((prev) => [...prev, response.data]);

      // Limpar campo de mensagem
      setNewMessage("");

      // Atualizar o chat na lista com a nova última mensagem
      setChats((prevChats) => {
        const updatedChats = prevChats.filter(
          (chat) => chat._id !== activeChat._id
        );

        // Atualizar o chat ativo com a última mensagem
        const updatedChat = {
          ...activeChat,
          lastMessage: {
            text: newMessage.trim(),
            sender: currentUser.uid,
            timestamp: new Date(),
          },
          updatedAt: new Date(),
        };

        return [updatedChat, ...updatedChats];
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

  // Função para buscar usuários (motoboys ou estabelecimentos)
  const searchUsers = async (query, type) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      let response;

      if (type === "MOTOBOY") {
        // Tentar endpoint de busca primeiro, fallback para listar todos
        try {
          response = await api.get(
            `/motoboys/search?q=${encodeURIComponent(query)}`
          );
        } catch (error) {
          // Se não existir endpoint de busca, busca todos e filtra localmente
          response = await api.get(`/motoboys`);
          const filteredData = response.data.filter((motoboy) => {
            const searchTerm = query.toLowerCase();
            return (
              motoboy.name?.toLowerCase().includes(searchTerm) ||
              motoboy.phone?.includes(query) ||
              motoboy.email?.toLowerCase().includes(searchTerm) ||
              motoboy.cpf?.includes(query)
            );
          });
          response.data = filteredData;
        }
      } else if (type === "STORE") {
        try {
          response = await api.get(
            `/stores/search?q=${encodeURIComponent(query)}`
          );
        } catch (error) {
          // Se não existir endpoint de busca, busca todos e filtra localmente
          response = await api.get(`/stores`);
          const filteredData = response.data.filter((store) => {
            const searchTerm = query.toLowerCase();
            return (
              store.businessName?.toLowerCase().includes(searchTerm) ||
              store.ownerName?.toLowerCase().includes(searchTerm) ||
              store.phone?.includes(query) ||
              store.email?.toLowerCase().includes(searchTerm) ||
              store.cnpj?.includes(query) ||
              store.address?.street?.toLowerCase().includes(searchTerm) ||
              store.address?.neighborhood?.toLowerCase().includes(searchTerm)
            );
          });
          response.data = filteredData;
        }
      }

      const users = response.data
        .slice(0, 50) // Limitar a 50 resultados para melhor performance
        .map((user) => ({
          ...user,
          userType: type,
          displayName: type === "STORE" ? user.businessName : user.name,
        }));

      setSearchResults(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Função para criar novo chat
  const createNewChat = async (user) => {
    if (!user || !user.firebaseUid) {
      console.error("Usuário inválido para criar chat");
      return;
    }

    try {
      setSearchLoading(true);

      // Verificar se já existe um chat com esse usuário
      const existingChat = chats.find(
        (chat) =>
          chat.firebaseUid.includes(user.firebaseUid) &&
          chat.firebaseUid.includes(currentUser.uid)
      );

      if (existingChat) {
        // Se o chat já existe, apenas seleciona ele
        setActiveChat(existingChat);
        fetchMessages(existingChat._id);
        setNewChatDialogOpen(false);
        setSelectedUser(null);
        setUserSearchQuery("");
        setSearchResults([]);

        // Feedback para usuário
        console.log("Chat já existe, redirecionando...");
        return;
      }

      // Criar novo chat
      const chatData = {
        firebaseUid: [currentUser.uid, user.firebaseUid],
        participantNames: {
          [currentUser.uid]: "Suporte Gringo",
          [user.firebaseUid]: user.displayName,
        },
        participants: [
          {
            firebaseUid: currentUser.uid,
            name: "Suporte Gringo",
            unreadCount: 0,
          },
          {
            firebaseUid: user.firebaseUid,
            name: user.displayName,
            unreadCount: 0,
          },
        ],
        status: "ACTIVE",
      };

      const response = await api.post("/chat", chatData);
      const newChat = response.data;

      // Adicionar à lista de chats
      setChats((prevChats) => [newChat, ...prevChats]);

      // Atualizar perfis de usuários
      setUserProfiles((prev) => ({
        ...prev,
        [user.firebaseUid]: {
          name: user.displayName,
          businessName: user.businessName,
          type: user.userType,
        },
      }));

      // Selecionar o novo chat
      setActiveChat(newChat);
      fetchMessages(newChat._id);

      // Fechar dialog
      setNewChatDialogOpen(false);
      setSelectedUser(null);
      setUserSearchQuery("");
      setSearchResults([]);

      if (isMobile) {
        setDrawerOpen(false);
      }
    } catch (error) {
      console.error("Erro ao criar novo chat:", error);
      alert("Erro ao criar chat. Tente novamente.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Effect para buscar usuários quando o tipo ou query mudarem
  useEffect(() => {
    if (newChatType && userSearchQuery) {
      const timeoutId = setTimeout(() => {
        searchUsers(userSearchQuery, newChatType);
      }, 500); // Debounce de 500ms

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [userSearchQuery, newChatType]);

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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              Conversas
            </Typography>
            <Tooltip title="Novo chat">
              <IconButton
                color="primary"
                onClick={() => setNewChatDialogOpen(true)}
                size="small"
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          </Box>

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
                      <Box
                        display={"flex"}
                        flexDirection="row"
                        gap={1}
                        justifyContent={"space-between"}
                        marginBottom={0.5}
                      >
                        <Typography
                          noWrap
                          fontWeight={chat.unreadCount > 0 ? "bold" : "normal"}
                        >
                          {chatName}
                        </Typography>
                        <Typography
                          noWrap
                          color="#AAA"
                          paddingLeft={1}
                          paddingRight={1}
                          borderRadius={"4px"}
                          sx={{ background: "#ccc" }}
                        >
                          {chat.status === "CLOSED" ? "Encerrado" : ""}
                        </Typography>
                      </Box>
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
                        {chat.lastMessage?.text ? (
                          <>
                            {chat.lastMessage.text.substring(0, 30)}
                            {chat.lastMessage.text.length > 30 ? "..." : ""}
                          </>
                        ) : (
                          "Sem mensagens"
                        )}
                        {" · "}
                        {chat.lastMessage?.timestamp
                          ? format(
                              new Date(chat.lastMessage.timestamp),
                              "HH:mm"
                            )
                          : format(new Date(chat.updatedAt), "dd/MM HH:mm")}
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
                              ? USER_TYPES.SUPPORT.color // Vermelho do Gringo para mensagens do suporte
                              : "#fff", // Branco para mensagens de outros usuários (não USER_TYPES.MOTOBOY.color)
                            color: isCurrentUser ? "#fff" : "text.primary", // Cor do texto apropriada
                            borderTopRightRadius: isCurrentUser ? 4 : 20,
                            borderTopLeftRadius: !isCurrentUser ? 4 : 20,
                            boxShadow: !isCurrentUser
                              ? "0px 1px 3px rgba(0,0,0,0.1)"
                              : "none", // Sombra sutil
                          }}
                        >
                          {/* Renderização baseada no tipo de mensagem */}
                          {msg.messageType === "FILE" ? (
                            <Box>
                              {/* Preview da imagem se for imagem */}
                              {msg.fileType?.startsWith("image/") &&
                                msg.fileUrl && (
                                  <Box sx={{ mb: 1 }}>
                                    <img
                                      src={msg.fileUrl}
                                      alt={msg.fileName}
                                      style={{
                                        maxWidth: "200px",
                                        maxHeight: "200px",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                      }}
                                      onClick={() =>
                                        setPreviewImage(msg.fileUrl)
                                      }
                                    />
                                  </Box>
                                )}

                              {/* Informações do arquivo */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                {msg.fileType?.startsWith("image/") ? (
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
                                    onClick={() =>
                                      window.open(msg.fileUrl, "_blank")
                                    }
                                  >
                                    {msg.fileName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{ opacity: 0.7 }}
                                  >
                                    {msg.fileSize
                                      ? `${(msg.fileSize / 1024).toFixed(1)} KB`
                                      : ""}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          ) : (
                            <Typography
                              variant="body1"
                              sx={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {msg.message}
                            </Typography>
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              mt: 0.5,
                              display: "block",
                              textAlign: "right",
                              opacity: 0.8,
                              color: isCurrentUser
                                ? "rgba(255, 255, 255, 0.7)"
                                : "text.secondary",
                            }}
                          >
                            {formatTime(msg.createdAt)}
                            {/* Verificar se o usuário atual está nos readBy */}
                            {msg.readBy &&
                              msg.readBy.some(
                                (read) => read.firebaseUid !== currentUser?.uid
                              ) &&
                              isCurrentUser && (
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
          sx={{
            p: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            bgcolor: "#fff",
          }}
        >
          {/* Preview do arquivo selecionado */}
          {selectedFile && (
            <Box sx={{ mb: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2">
                  Arquivo selecionado:
                </Typography>
                <IconButton size="small" onClick={handleCancelFile}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {filePreview ? (
                  <img
                    src={filePreview}
                    alt={selectedFile.name}
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: "60px",
                      height: "60px",
                      bgcolor: "#ddd",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileIcon />
                  </Box>
                )}

                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" noWrap>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSendFile}
                  disabled={uploadingFile}
                  startIcon={
                    uploadingFile ? (
                      <CircularProgress size={16} />
                    ) : (
                      <UploadIcon />
                    )
                  }
                >
                  {uploadingFile ? "Enviando..." : "Enviar"}
                </Button>
              </Box>
            </Box>
          )}

          {/* Input de arquivo oculto */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: "none" }}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />

          <Grid
            container
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
          >
            <Grid item xs width={"80%"}>
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
                        <IconButton
                          color="primary"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFile || sendingMessage}
                        >
                          <AttachFileIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Box
                  padding={1}
                  marginLeft={2}
                  width={"150px"}
                  sx={{
                    textAlign: "center",
                    backgroundColor:
                      activeChat?.status === "ACTIVE" ? "#4caf50" : "#f44336",
                    borderRadius: 2,
                  }}
                >
                  <Button
                    onClick={() =>
                      handleChatStatus(
                        activeChat?.status === "ACTIVE" ? "CLOSED" : "ACTIVE"
                      )
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <Typography variant="caption" color="#fff">
                      {activeChat?.status === "ACTIVE"
                        ? "Atendimento ativo"
                        : "Atendimento encerrado"}
                    </Typography>
                  </Button>
                </Box>
              </Box>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendMessage}
                disabled={
                  (!newMessage.trim() && !selectedFile) ||
                  sendingMessage ||
                  uploadingFile
                }
                sx={{ borderRadius: "50%", minWidth: "auto", p: 1.5 }}
              >
                {sendingMessage || uploadingFile ? (
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
          <>
            <SideDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              variant="temporary"
              title="Gringo Delivery"
              logoUrl="https://i.imgur.com/8jOdfcO.png"
              logoAlt="Gringo Delivery"
              logoHeight={50}
              menuItems={SUPPORT_MENU_ITEMS}
              // Passa diretamente a função de logout
              footerItems={createSupportFooterItems(handleLogout)}
            />
            {/* FAB para criar novo chat no mobile */}
            {!activeChat && (
              <Fab
                color="primary"
                aria-label="novo chat"
                onClick={() => setNewChatDialogOpen(true)}
                sx={{
                  position: "fixed",
                  bottom: 16,
                  right: 16,
                  zIndex: 1000,
                }}
              >
                <AddIcon />
              </Fab>
            )}
          </>
        ) : (
          <SideDrawer
            open={true}
            variant="permanent"
            title="Gringo Delivery"
            logoUrl="https://i.imgur.com/8jOdfcO.png"
            logoAlt="Gringo Delivery"
            logoHeight={50}
            menuItems={SUPPORT_MENU_ITEMS}
            footerItems={createSupportFooterItems(handleLogout)}
          />
        )}
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

      {/* Dialog para criar novo chat */}
      <Dialog
        open={newChatDialogOpen}
        onClose={() => {
          setNewChatDialogOpen(false);
          setNewChatType("");
          setUserSearchQuery("");
          setSearchResults([]);
          setSelectedUser(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6">Iniciar Nova Conversa</Typography>
            <IconButton
              onClick={() => {
                setNewChatDialogOpen(false);
                setNewChatType("");
                setUserSearchQuery("");
                setSearchResults([]);
                setSelectedUser(null);
              }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {!newChatType ? (
            // Seleção do tipo de usuário
            <Box sx={{ py: 2 }}>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Com quem você gostaria de iniciar uma conversa?
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card
                    sx={{
                      cursor: "pointer",
                      "&:hover": { elevation: 4 },
                      transition: "all 0.2s",
                    }}
                    onClick={() => setNewChatType("MOTOBOY")}
                  >
                    <CardContent sx={{ textAlign: "center", py: 3 }}>
                      <Avatar
                        sx={{
                          bgcolor: USER_TYPES.MOTOBOY.color,
                          mx: "auto",
                          mb: 2,
                          width: 60,
                          height: 60,
                        }}
                      >
                        <MotoboyIcon fontSize="large" />
                      </Avatar>
                      <Typography variant="h6">Motoboy</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Conversar com um entregador
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6}>
                  <Card
                    sx={{
                      cursor: "pointer",
                      "&:hover": { elevation: 4 },
                      transition: "all 0.2s",
                    }}
                    onClick={() => setNewChatType("STORE")}
                  >
                    <CardContent sx={{ textAlign: "center", py: 3 }}>
                      <Avatar
                        sx={{
                          bgcolor: USER_TYPES.STORE.color,
                          mx: "auto",
                          mb: 2,
                          width: 60,
                          height: 60,
                        }}
                      >
                        <StoreIcon fontSize="large" />
                      </Avatar>
                      <Typography variant="h6">Estabelecimento</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Conversar com uma loja
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          ) : (
            // Busca e seleção de usuário
            <Box sx={{ py: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <IconButton onClick={() => setNewChatType("")} size="small">
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Buscar{" "}
                  {newChatType === "MOTOBOY" ? "Motoboy" : "Estabelecimento"}
                </Typography>
              </Box>

              <TextField
                fullWidth
                placeholder={`Digite o nome do ${
                  newChatType === "MOTOBOY" ? "motoboy" : "estabelecimento"
                }...`}
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                variant="outlined"
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              {searchLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : searchResults.length > 0 ? (
                <List sx={{ maxHeight: 300, overflow: "auto" }}>
                  {searchResults.map((user) => (
                    <ListItemButton
                      key={user.firebaseUid || user._id}
                      onClick={() => setSelectedUser(user)}
                      selected={selectedUser?.firebaseUid === user.firebaseUid}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor:
                              newChatType === "MOTOBOY"
                                ? USER_TYPES.MOTOBOY.color
                                : USER_TYPES.STORE.color,
                          }}
                        >
                          {newChatType === "MOTOBOY" ? (
                            <MotoboyIcon />
                          ) : (
                            <StoreIcon />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.displayName}
                        secondary={
                          <Box>
                            {newChatType === "STORE" ? (
                              <>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {user.ownerName && `Dono: ${user.ownerName}`}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {user.address?.street
                                    ? `${user.address.street}, ${user.address.neighborhood}`
                                    : "Endereço não informado"}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {user.phone || "Sem telefone"} •{" "}
                                  {user.email || "Sem email"}
                                </Typography>
                              </>
                            ) : (
                              <>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {user.phone || "Sem telefone"} •{" "}
                                  {user.email || "Sem email"}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Status:{" "}
                                  {user.isAvailable
                                    ? "Disponível"
                                    : "Indisponível"}
                                </Typography>
                              </>
                            )}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              ) : userSearchQuery.length >= 2 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center", py: 4 }}
                >
                  Nenhum{" "}
                  {newChatType === "MOTOBOY" ? "motoboy" : "estabelecimento"}{" "}
                  encontrado
                </Typography>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center", py: 4 }}
                >
                  Digite pelo menos 2 caracteres para buscar
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>

        {newChatType && selectedUser && (
          <DialogActions>
            <Button onClick={() => setSelectedUser(null)}>Cancelar</Button>
            <Button
              onClick={() => createNewChat(selectedUser)}
              variant="contained"
              disabled={searchLoading}
            >
              {searchLoading ? (
                <CircularProgress size={20} />
              ) : (
                "Iniciar Conversa"
              )}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Modal para preview de imagem */}
      <Modal
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        aria-labelledby="image-preview-title"
        aria-describedby="image-preview-description"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            position: "relative",
            maxWidth: "90vw",
            maxHeight: "90vh",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 2,
            outline: "none",
            borderRadius: 2,
          }}
        >
          <IconButton
            onClick={() => setPreviewImage(null)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1,
              bgcolor: "rgba(0, 0, 0, 0.3)",
              color: "white",
              "&:hover": {
                bgcolor: "rgba(0, 0, 0, 0.5)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
          <img
            src={previewImage}
            alt="Preview"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "85vh",
              objectFit: "contain",
            }}
          />
        </Box>
      </Modal>
    </Box>
  );
};

export default ChatPage;
