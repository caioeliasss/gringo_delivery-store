import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Rating,
} from "@mui/material";

const Avaliate = ({ open, onClose, onSubmit, order }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [motoboyName, setMotoboyName] = useState("");

  useEffect(() => {
    if (open) {
      setMotoboyName(order.motoboy.name);
      setRating(0);
      setFeedback("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (onSubmit) {
      const motoboyId = order.motoboy.motoboyId;
      const storeId = order.store._id;
      const orderId = order._id;
      const storeName = order.store.name;

      onSubmit({ rating, feedback, motoboyId, storeId, orderId, storeName });
    }
    setRating(0);
    setFeedback("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Avaliar Entregador: {motoboyName}</DialogTitle>
      <DialogContent>
        <Rating
          name="delivery-person-rating"
          value={rating}
          onChange={(event, newValue) => {
            setRating(newValue);
          }}
        />
        <TextField
          label="Feedback"
          multiline
          rows={4}
          variant="outlined"
          fullWidth
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} color="primary">
          Enviar Avaliação
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Avaliate;
