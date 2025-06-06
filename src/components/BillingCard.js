import React from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";

const BillingCard = ({ invoice, onViewDetails }) => {
  return (
    <Card variant="outlined" sx={{ margin: 2 }}>
      <CardContent>
        <Typography variant="h5" component="div">
          Fatura #{invoice.id}
        </Typography>
        <Typography color="text.secondary">
          Valor: R$ {invoice.amount.toFixed(2)}
        </Typography>
        <Typography color="text.secondary">
          Vencimento: {new Date(invoice.dueDate).toLocaleDateString()}
        </Typography>
        <Typography color="text.secondary">Status: {invoice.status}</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={onViewDetails}
          sx={{ marginTop: 2 }}
        >
          Ver Detalhes
        </Button>
      </CardContent>
    </Card>
  );
};

export default BillingCard;
