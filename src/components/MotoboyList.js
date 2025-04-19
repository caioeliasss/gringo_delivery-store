const handleAssignMotoboy = async (motoboyId, motoboyName) => {
  try {
    setAssigning(true);
    setAssigningId(motoboyId);
    setError(null);

    // Messages for queue status
    const messages = [
      `Solicitando entrega para ${motoboyName}...`,
      `Aguardando resposta de ${motoboyName}...`,
    ];

    let msgIndex = 0;
    setError(messages[0]);

    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setError(messages[msgIndex]);
    }, 3000);

    const response = await api.post(`/orders/${orderId}/assign-motoboy`, {
      motoboyId,
    });

    clearInterval(msgInterval);

    if (response.data.success) {
      setSuccess(
        `Motoboy ${response.data.motoboy.name} atribuído com sucesso.`
      );

      // Notificar o componente pai
      if (onMotoboyAssigned) {
        onMotoboyAssigned(response.data.order);
      }
    } else {
      // The motoboy declined or became unavailable
      setError(`${motoboyName} não está disponível para esta entrega.`);

      // Refresh the list after rejection
      fetchMotoboys();
    }

    setAssigning(false);
    setAssigningId(null);
  } catch (err) {
    console.error("Erro ao atribuir motoboy:", err);
    setError("Não foi possível atribuir o motoboy selecionado.");
    setAssigning(false);
    setAssigningId(null);

    // Refresh the list after error
    fetchMotoboys();
  }
};
