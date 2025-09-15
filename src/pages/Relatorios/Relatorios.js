// src/pages/Relatorios/Relatorios.js
import React, { useState } from "react";
import "./Relatorios.css";
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Alert,
  Fade,
  IconButton,
  Drawer,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  Chip,
} from "@mui/material";
import {
  AttachMoney as FinanceIcon,
  ShoppingCart as PedidosIcon,
  LocalShipping as CorridasIcon,
  ReportProblem as OcorrenciasIcon,
  Chat as ChatIcon,
  Store as EstabelecimentosIcon,
  TwoWheeler as EntregadoresIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

// Importar componentes de relatórios
import ReportCard from "../../components/Reports/ReportCard";
import FinanceiroReport from "../../components/Reports/FinanceiroReport";
import PedidosReport from "../../components/Reports/PedidosReport";
import CorridasReport from "../../components/Reports/CorridasReport";
import OcorrenciasReport from "../../components/Reports/OcorrenciasReport";
import ChatReport from "../../components/Reports/ChatReport";
import EstabelecimentosReport from "../../components/Reports/EstabelecimentosReport";
import EntregadoresReport from "../../components/Reports/EntregadoresReport";

// Hooks
import {
  useReportPermissions,
  useHasAnyReportAccess,
  REPORT_PERMISSIONS,
} from "../../hooks/useReportPermissions";
import { useSuporteAuth } from "../../contexts/SuporteAuthContext";

const Relatorios = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { supportUser, loading } = useSuporteAuth();
  const permissions = useReportPermissions();
  const hasAnyAccess = useHasAnyReportAccess();

  const [selectedReport, setSelectedReport] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Configuração dos relatórios
  const reportConfigs = [
    {
      id: "financeiro",
      title: "Relatório Financeiro",
      description: "Receitas, despesas, lucros e análise financeira completa",
      icon: <FinanceIcon sx={{ fontSize: 30 }} />,
      color: "success",
      component: FinanceiroReport,
      requiredRoles: REPORT_PERMISSIONS.financeiro,
    },
    {
      id: "pedidos",
      title: "Relatório de Pedidos",
      description:
        "Status dos pedidos, volume de vendas e análise de performance",
      icon: <PedidosIcon sx={{ fontSize: 30 }} />,
      color: "primary",
      component: PedidosReport,
      requiredRoles: REPORT_PERMISSIONS.pedidos,
    },
    {
      id: "corridas",
      title: "Relatório de Corridas",
      description: "Entregas realizadas, tempo médio e eficiência logística",
      icon: <CorridasIcon sx={{ fontSize: 30 }} />,
      color: "info",
      component: CorridasReport,
      requiredRoles: REPORT_PERMISSIONS.corridas,
    },
    {
      id: "ocorrencias",
      title: "Relatório de Ocorrências",
      description: "Problemas reportados, resoluções e métricas de qualidade",
      icon: <OcorrenciasIcon sx={{ fontSize: 30 }} />,
      color: "warning",
      component: OcorrenciasReport,
      requiredRoles: REPORT_PERMISSIONS.ocorrencias,
    },
    {
      id: "chat",
      title: "Relatório de Chat",
      description: "Atendimentos, tempo de resposta e satisfação do cliente",
      icon: <ChatIcon sx={{ fontSize: 30 }} />,
      color: "secondary",
      component: ChatReport,
      requiredRoles: REPORT_PERMISSIONS.chat,
    },
    {
      id: "estabelecimentos",
      title: "Relatório de Estabelecimentos",
      description: "Performance dos parceiros, vendas e avaliações",
      icon: <EstabelecimentosIcon sx={{ fontSize: 30 }} />,
      color: "error",
      component: EstabelecimentosReport,
      requiredRoles: REPORT_PERMISSIONS.estabelecimentos,
    },
    {
      id: "entregadores",
      title: "Relatório de Entregadores",
      description: "Performance dos motoboys, entregas e ganhos",
      icon: <EntregadoresIcon sx={{ fontSize: 30 }} />,
      color: "info",
      component: EntregadoresReport,
      requiredRoles: REPORT_PERMISSIONS.entregadores,
    },
  ];

  const handleReportAccess = (reportConfig) => {
    if (permissions[reportConfig.id]) {
      setSelectedReport(reportConfig);
      if (isMobile) {
        setDrawerOpen(false);
      }
    }
  };

  const handleBackToMenu = () => {
    setSelectedReport(null);
  };

  const renderReportGrid = () => (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Central de Relatórios
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          align="center"
          sx={{ mb: 2 }}
        >
          Acesse relatórios detalhados baseados em suas permissões
        </Typography>

        {/* Mostrar roles do usuário */}
        {supportUser?.role && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            {(Array.isArray(supportUser.role)
              ? supportUser.role
              : [supportUser.role]
            ).map((role) => (
              <Chip
                key={role}
                label={role.charAt(0).toUpperCase() + role.slice(1)}
                color="success"
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        )}
      </Box>

      {!hasAnyAccess ? (
        <Alert severity="warning" sx={{ mb: 4 }}>
          Você não possui permissão para acessar nenhum relatório. Entre em
          contato com o administrador.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {reportConfigs.map((report) => {
            const hasPermission = permissions[report.id];

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={report.id}>
                <Fade in timeout={300 + report.id.length * 100}>
                  <div className="report-card-animated">
                    <ReportCard
                      title={report.title}
                      description={report.description}
                      icon={report.icon}
                      color={report.color}
                      onAccess={() => handleReportAccess(report)}
                      disabled={!hasPermission}
                      requiredRoles={report.requiredRoles}
                      userRoles={permissions.userRoles || []}
                    />
                  </div>
                </Fade>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );

  // Se está carregando, mostrar loading
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Typography>Carregando permissões...</Typography>
      </Box>
    );
  }

  // Se não tem usuário logado
  if (!supportUser) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">
          Você precisa estar logado para acessar os relatórios.
        </Alert>
      </Container>
    );
  }

  // Se está visualizando um relatório específico
  if (selectedReport) {
    const ReportComponent = selectedReport.component;

    return (
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <AppBar position="sticky" color="default">
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleBackToMenu}>
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
              {selectedReport.title}
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
          <ReportComponent />
        </Box>
      </Box>
    );
  }

  // Página principal com grid de relatórios
  return (
    <Box
      sx={{ minHeight: "100vh", bgcolor: "background.default" }}
      className="reports-main-background"
    >
      {renderReportGrid()}
    </Box>
  );
};

export default Relatorios;
