import { styled } from "@mui/material/styles";

export const StyledCard = styled(Card)(({ theme }) => ({
  transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: theme.shadows[8],
  },
}));

export const StatusChip = styled(Chip)(({ theme, status }) => {
  const colors = {
    ABERTO: {
      backgroundColor: theme.palette.warning.light,
      color: theme.palette.warning.contrastText,
    },
    PENDENTE: {
      backgroundColor: theme.palette.info.light,
      color: theme.palette.info.contrastText,
    },
    FINALIZADA: {
      backgroundColor: theme.palette.success.light,
      color: theme.palette.success.contrastText,
    },
  };

  return {
    ...colors[status],
    fontWeight: "bold",
  };
});
