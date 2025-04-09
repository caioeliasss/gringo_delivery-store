import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro no login:', error.message);
      setError(
        error.code === 'auth/invalid-credential' 
          ? 'Email ou senha incorretos' 
          : 'Falha ao fazer login. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro no login com Google:', error.message);
      setError('Falha ao fazer login com Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form-container">
        <h1 className="login-title">Login</h1>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="login-input-container">
            <label className="login-label">Email</label>
            <input
              type="email"
              className="login-input"
              placeholder="Seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="login-input-container">
            <label className="login-label">Senha</label>
            <input
              type="password"
              className="login-input"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Carregando..." : "Entrar"}
          </button>
        </form>
        
        {1 === 2 && 
        <button 
          className="login-google-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          Entrar com Google
        </button>}
        
        <div className="login-register-container">
          <span className="login-register-text">Não tem uma conta? </span>
          <Link to="/register" className="login-register-link">Registre-se</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;