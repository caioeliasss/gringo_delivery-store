# 🧪 CURL Tests - Simulação de Polling iFood Handshake

# ========================================
# CONFIGURAÇÃO
# ========================================
BASE_URL="http://localhost:8080"
TEST_STORE_UID="umsIgjDVQEPflPwrKRMinRL8TYP2"

echo "🧪 Testando Simulação de Polling iFood Handshake"
echo "================================================"
echo "Base URL: $BASE_URL"
echo ""

# ========================================
# 1. CRIAR DISPUTE SIMPLES
# ========================================
echo "1️⃣ Criando dispute simples"
echo "----------------------------"
curl -X POST \
  "$BASE_URL/api/test/handshake/dispute" \
  -H "Content-Type: application/json" \
  -d '{
    "storeFirebaseUid": "'"$TEST_STORE_UID"'",
    "customData": {
      "disputeType": "QUALITY",
      "description": "Pizza chegou fria e sem sabor"
    }
  }' \
  -w "\nStatus: %{http_code}\n\n"

# ========================================
# 2. CRIAR DISPUTE URGENTE (1 HORA)
# ========================================
echo "2️⃣ Criando dispute URGENTE (expira em 1 hora)"
echo "----------------------------------------------"
curl -X POST \
  "$BASE_URL/api/test/handshake/urgent-dispute" \
  -H "Content-Type: application/json" \
  -d '{
    "storeFirebaseUid": "'"$TEST_STORE_UID"'"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# ========================================
# 3. CRIAR DISPUTE CRÍTICO (15 MINUTOS)
# ========================================
echo "3️⃣ Criando dispute CRÍTICO (expira em 15 minutos)"
echo "--------------------------------------------------"
curl -X POST \
  "$BASE_URL/api/test/handshake/critical-dispute" \
  -H "Content-Type: application/json" \
  -d '{
    "storeFirebaseUid": "'"$TEST_STORE_UID"'"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# ========================================
# 4. CRIAR SETTLEMENT PARA DISPUTE EXISTENTE
# ========================================
echo "4️⃣ Criando settlement (substitua DISPUTE_ID)"
echo "--------------------------------------------"
# IMPORTANTE: Substitua pelo ID de um dispute real
DISPUTE_ID="dispute_1725298800000_123"
ORIGINAL_DISPUTE_EVENT_ID="event_dispute_1725298800000_123"

curl -X POST \
  "$BASE_URL/api/test/handshake/settlement" \
  -H "Content-Type: application/json" \
  -d '{
    "disputeId": "'"$DISPUTE_ID"'",
    "storeFirebaseUid": "'"$TEST_STORE_UID"'",
    "customData": {
      "originalDisputeEventId": "'"$ORIGINAL_DISPUTE_EVENT_ID"'",
      "settlementResult": "ALTERNATIVE_ACCEPTED"
    }
  }' \
  -w "\nStatus: %{http_code}\n\n"

# ========================================
# 5. SIMULAR FLUXO COMPLETO
# ========================================
echo "5️⃣ Simulando fluxo completo (dispute → settlement)"
echo "--------------------------------------------------"
curl -X POST \
  "$BASE_URL/api/test/handshake/complete-flow" \
  -H "Content-Type: application/json" \
  -d '{
    "storeFirebaseUid": "'"$TEST_STORE_UID"'",
    "settlementResult": "ACCEPTED"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# ========================================
# 6. CRIAR MÚLTIPLOS EVENTOS
# ========================================
echo "6️⃣ Criando múltiplos eventos (3 disputes + 1 settlement)"
echo "--------------------------------------------------------"
curl -X POST \
  "$BASE_URL/api/test/handshake/batch-events" \
  -H "Content-Type: application/json" \
  -d '{
    "storeFirebaseUid": "'"$TEST_STORE_UID"'",
    "disputeCount": 3,
    "settlementCount": 1
  }' \
  -w "\nStatus: %{http_code}\n\n"

# ========================================
# 7. VERIFICAR STATUS DOS DADOS
# ========================================
echo "7️⃣ Verificando status dos dados de teste"
echo "-----------------------------------------"
curl -X GET \
  "$BASE_URL/api/test/handshake/status" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# ========================================
# 8. TESTAR DADOS CUSTOMIZADOS
# ========================================
echo "8️⃣ Criando dispute com dados customizados"
echo "------------------------------------------"
curl -X POST \
  "$BASE_URL/api/test/handshake/dispute" \
  -H "Content-Type: application/json" \
  -d '{
    "storeFirebaseUid": "'"$TEST_STORE_UID"'",
    "customData": {
      "disputeType": "MISSING_ITEMS",
      "description": "Faltaram 2 refrigerantes no pedido",
      "customerComplaint": "Pedi 3 refrigerantes mas só recebi 1",
      "disputedItems": [
        {
          "id": "item_456",
          "name": "Coca-Cola 350ml",
          "quantity": 2,
          "price": {
            "value": 6.00,
            "currency": "BRL"
          }
        }
      ],
      "hoursToExpire": 12
    }
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ Todos os testes de simulação concluídos!"
echo ""
echo "📝 Próximos passos:"
echo "1. Verifique o banco de dados para ver os eventos criados"
echo "2. Teste a interface web para ver os disputes pendentes"
echo "3. Use a API de handshake para responder aos disputes"
echo ""
echo "🧹 Para limpar dados de teste:"
echo "curl -X DELETE '$BASE_URL/api/test/handshake/cleanup'"
