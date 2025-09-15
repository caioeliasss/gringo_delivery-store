// src/components/Reports/ReportCard.js
import React from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
} from "@mui/material";
import { styled } from "@mui/material/styles";

const StyledCard = styled(Card)(({ theme, disabled }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  transition: "all 0.3s ease",
  opacity: disabled ? 0.6 : 1,
  pointerEvents: disabled ? "none" : "auto",
  "&:hover": {
    transform: disabled ? "none" : "translateY(-4px)",
    boxShadow: disabled ? theme.shadows[1] : theme.shadows[8],
  },
}));

const IconContainer = styled(Box)(({ theme, color }) => ({
  width: 60,
  height: 60,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette[color]?.light || theme.palette.primary.light,
  color: theme.palette[color]?.dark || theme.palette.primary.dark,
  marginBottom: theme.spacing(2),
}));

const ReportCard = ({
  title,
  description,
  icon,
  color = "primary",
  onAccess,
  disabled = false,
  requiredRoles = [],
  userRoles = [],
}) => {
  const hasAccess = !disabled;

  return (
    <StyledCard disabled={disabled} elevation={disabled ? 1 : 3}>
      <CardContent sx={{ flexGrow: 1, textAlign: "center" }}>
        <IconContainer color={color}>{icon}</IconContainer>

        <Typography variant="h6" component="h2" gutterBottom>
          {title}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>

        {requiredRoles.length > 0 && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.5,
              justifyContent: "center",
            }}
          >
            {requiredRoles.map((role) => (
              <Chip
                key={role}
                label={role}
                size="small"
                variant={userRoles.includes(role) ? "filled" : "outlined"}
                color={userRoles.includes(role) ? "success" : "default"}
              />
            ))}
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: "center", pb: 2 }}>
        <Button
          variant={hasAccess ? "contained" : "outlined"}
          color={color}
          onClick={onAccess}
          disabled={disabled}
          fullWidth
          sx={{ mx: 2 }}
        >
          {hasAccess ? "Acessar Relatório" : "Sem Permissão"}
        </Button>
      </CardActions>
    </StyledCard>
  );
};

export default ReportCard;
