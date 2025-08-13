import React, { useState, useContext } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import { AuthContext } from "../../contexts/AuthContext";
import { getStoreNotifications } from "../../services/api";

const QuickNotifications = () => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const { currentUser } = useContext(AuthContext);

  // Busca notificações do backend ao expandir
  const fetchNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError("");
    try {
      const res = await getStoreNotifications(currentUser.uid);
      const data = res.data;
      const filteredData = data.filter(
        (n) =>
          n.type === "CHAT_MESSAGE" ||
          n.type === "ORDER_STATUS_UPDATE" ||
          n.type === "OCCURRENCE_CHANGE"
      );
      setNotifications(
        (filteredData || []).map((n) => ({
          id: n._id,
          title: n.title || n.type || "Notificação",
          body: n.message || n.body || "",
          date: n.createdAt ? new Date(n.createdAt).toLocaleString() : "",
        }))
      );
    } catch (err) {
      setError("Erro ao buscar notificações");
    } finally {
      setLoading(false);
    }
  };

  const handleAccordionChange = (event, isExpanded) => {
    setExpanded(isExpanded);
    if (isExpanded && notifications.length === 0 && !loading) {
      fetchNotifications();
    }
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={handleAccordionChange}
      sx={{
        borderRadius: 1,
        overflow: "hidden",
        mt: 4,
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: expanded ? "white" : "primary.main",
          color: expanded ? "primary.main" : "white",
          "&:hover": {
            backgroundColor: expanded ? "grey.100" : "primary.dark",
            color: expanded ? "primary.main" : "white",
          },
          "& .MuiAccordionSummary-expandIconWrapper": {
            color: expanded ? "primary.main" : "white",
          },
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Notificações Rápidas
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Veja abaixo as notificações mais recentes recebidas pela loja.
        </Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : notifications.length === 0 ? (
          <Alert severity="info">
            Nenhuma notificação recebida recentemente.
          </Alert>
        ) : (
          <List>
            {notifications.map((notif) => (
              <ListItem key={notif.id} alignItems="flex-start" sx={{ mb: 2 }}>
                <ListItemIcon>
                  <NotificationsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {notif.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {notif.body}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {notif.date}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default QuickNotifications;
