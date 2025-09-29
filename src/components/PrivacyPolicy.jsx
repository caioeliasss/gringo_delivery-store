import React from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";

const PrivacyPolicy = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            color: "#2d3748",
            borderBottom: "3px solid #4299e1",
            pb: 2,
            mb: 3,
          }}
        >
          Política de Privacidade - Gringo Delivery Entregador
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "#718096",
            fontStyle: "italic",
            mb: 4,
          }}
        >
          <strong>Data de vigência:</strong> 29 de setembro de 2025
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ color: "#2d3748", mt: 4 }}
          >
            1. Informações que coletamos
          </Typography>

          <Typography
            variant="h5"
            component="h3"
            gutterBottom
            sx={{ color: "#4a5568" }}
          >
            Permissão de Câmera
          </Typography>
          <Typography paragraph>
            Nosso aplicativo solicita acesso à câmera do seu dispositivo para as
            seguintes finalidades:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Upload de documentos: Permitir que entregadores fotografem documentos necessários para verificação e cadastro" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Comprovantes de entrega: Capturar fotos como comprovante de entrega dos pedidos" />
            </ListItem>
          </List>

          <Typography
            variant="h5"
            component="h3"
            gutterBottom
            sx={{ color: "#4a5568" }}
          >
            Como usamos essas informações
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="As fotos capturadas são utilizadas exclusivamente para fins operacionais do serviço de entrega" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Não compartilhamos, vendemos ou utilizamos suas imagens para outros propósitos" />
            </ListItem>
            <ListItem>
              <ListItemText primary="As imagens são armazenadas de forma segura em nossos servidores" />
            </ListItem>
          </List>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ color: "#2d3748", mt: 4 }}
          >
            2. Outras Permissões
          </Typography>

          <Typography
            variant="h5"
            component="h3"
            gutterBottom
            sx={{ color: "#4a5568" }}
          >
            Localização
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Necessária para rastreamento de entregas e navegação" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Utilizada apenas durante o uso ativo do aplicativo" />
            </ListItem>
          </List>

          <Typography
            variant="h5"
            component="h3"
            gutterBottom
            sx={{ color: "#4a5568" }}
          >
            Notificações
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Para informar sobre novos pedidos e atualizações de status" />
            </ListItem>
          </List>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ color: "#2d3748", mt: 4 }}
          >
            3. Segurança dos dados
          </Typography>
          <Typography paragraph>
            Implementamos medidas de segurança técnicas e organizacionais
            apropriadas para proteger suas informações pessoais.
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ color: "#2d3748", mt: 4 }}
          >
            4. Seus direitos
          </Typography>
          <Typography paragraph>Você tem o direito de:</Typography>
          <List>
            <ListItem>
              <ListItemText primary="Acessar suas informações pessoais" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Solicitar correção de dados incorretos" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Solicitar exclusão de seus dados" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Retirar seu consentimento a qualquer momento" />
            </ListItem>
          </List>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ color: "#2d3748", mt: 4 }}
          >
            5. Contato
          </Typography>
          <Paper
            sx={{
              backgroundColor: "#ebf8ff",
              p: 2,
              borderLeft: "4px solid #4299e1",
            }}
          >
            <Typography paragraph>
              Para questões sobre esta política de privacidade, entre em
              contato:
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="Email: liparinidanilo5@gmail.com" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Telefone: 19 99200-7724" />
              </ListItem>
            </List>
          </Paper>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ color: "#2d3748", mt: 4 }}
          >
            6. Alterações nesta política
          </Typography>
          <Typography paragraph>
            Podemos atualizar esta política periodicamente. Recomendamos revisar
            esta página regularmente.
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="body2"
            sx={{
              color: "#718096",
              fontStyle: "italic",
            }}
          >
            Gringo Delivery © 2025
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy;
