const Travel = require("../models/Travel");

class TravelService {
  // Métodos do serviço de viagens
  async updateTravelStatus(id, status) {
    try {
      let travel;
      console.warn(`Atualizando status da viagem ${id} para ${status}`);
      if (status === "em_entrega") {
        // Lógica para quando a viagem está em entrega
        travel = await Travel.findByIdAndUpdate(
          id,
          {
            status: status,
            dispatchAt: new Date(),
          },
          { new: true }
        );
      } else if (status === "entregue") {
        // Lógica para quando a viagem foi entregue
        travel = await Travel.findByIdAndUpdate(
          id,
          {
            status: status,
            deliveryTime: new Date(),
          },
          { new: true }
        );
      } else {
        // Para outros status, apenas atualizar o status
        travel = await Travel.findByIdAndUpdate(
          id,
          {
            status: status,
          },
          { new: true }
        );
      }

      if (status === "entregue") {
        const motoboyScore = await Motoboy.findById(travel.motoboyId).select(
          "score"
        );

        // Validações para evitar NaN
        if (!travel.dispatchAt || !travel.deliveryTime) {
          console.error("Erro: dispatchAt ou deliveryTime não definidos");
          return res.status(400).json({
            message: "Dados de tempo da viagem incompletos",
          });
        }

        const dispatchAt = new Date(travel.dispatchAt);
        const deliveryTime = new Date();
        const timeDiff = Math.abs(deliveryTime - dispatchAt);
        const minutesDiff = timeDiff / (1000 * 60);

        // Validar se os valores são válidos
        const distance = parseFloat(travel.distance) || 0;
        const customerCount = parseInt(travel.customerCount) || 1;

        if (distance <= 0 || minutesDiff <= 0) {
          console.warn(
            `Valores inválidos: distance=${distance}, minutesDiff=${minutesDiff}`
          );
          // Se não temos dados válidos, aplicar rating neutro
          const neutralRating = 0;
          const currentScore = parseFloat(motoboyScore?.score) || 0;

          const updatedMotoboy = await Motoboy.findByIdAndUpdate(
            travel.motoboyId,
            {
              score: currentScore,
              isAvailable: true,
              race: { active: false },
            },
            { new: true }
          );

          console.warn(
            `Aplicado rating neutro para viagem com dados inválidos`
          );
        } else {
          // Calcular velocidade com validações
          const velocidade = (distance / minutesDiff) * customerCount;

          // Fórmula dinâmica de avaliação baseada na velocidade
          const velocidadeReferencia = 0.25; // km/min considerada como padrão
          const fatorEscala = 1.2; // Ajusta a sensibilidade da curva

          // Validar se velocidade é um número válido
          if (!isFinite(velocidade) || isNaN(velocidade)) {
            console.error(`Velocidade inválida: ${velocidade}`);
            return { message: "Erro no cálculo da velocidade" };
          }

          const rating =
            0.3 *
            Math.tanh(
              (fatorEscala * (velocidade - velocidadeReferencia)) /
                velocidadeReferencia
            );

          const finalRating = Math.max(-0.3, Math.min(0.3, rating));
          const currentScore = parseFloat(motoboyScore?.score) || 0;
          const newScore = finalRating + currentScore;

          // Validar score final antes de salvar
          if (!isFinite(newScore) || isNaN(newScore)) {
            console.error(`Score final inválido: ${newScore}`);
            return { message: "Erro no cálculo do score final" };
          }

          const updatedMotoboy = await Motoboy.findByIdAndUpdate(
            travel.motoboyId,
            {
              score: newScore,
              isAvailable: true,
              race: { active: false },
            },
            { new: true }
          );

          console.warn(
            `motoboy atualizado: ${
              updatedMotoboy.name
            }, nova score: ${newScore.toFixed(
              3
            )}, finalRating da viagem: ${finalRating.toFixed(
              3
            )}, velocidade: ${velocidade.toFixed(3)} km/min`
          );
        }
      }

      return travel;
    } catch (error) {
      return { message: error.message };
    }
  }
}

module.exports = new TravelService();
