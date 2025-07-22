// Exemplo de como adicionar a rota para a página de pedidos
// Este código deve ser adicionado ao seu arquivo de rotas principal

import { Routes, Route } from "react-router-dom";
import OrdersPage from "../pages/Orders/Orders";
import OcorrenciasPage from "../pages/Ocorrencias/ocorrencias";
// ... outras importações

function AppRoutes() {
  return (
    <Routes>
      {/* ... outras rotas */}
      <Route path="/pedidos" element={<OrdersPage />} />
      <Route path="/ocorrencias" element={<OcorrenciasPage />} />
      {/* ... outras rotas */}
    </Routes>
  );
}

export default AppRoutes;
