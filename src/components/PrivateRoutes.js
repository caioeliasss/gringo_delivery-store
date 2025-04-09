import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

// Este componente é um wrapper para verificar se o usuário está autenticado
// antes de permitir acesso à rota protegida
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!currentUser) {
      // Redireciona para login se não estiver autenticado
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [currentUser, navigation]);

  // Só renderiza o conteúdo se o usuário estiver autenticado
  if (!currentUser) {
    return null;
  }

  return children;
};

export default PrivateRoute;