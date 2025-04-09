import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createUserProfile } from '../../services/api';
import './Register.css';

const Register = () => {
  const [cnpj, setCnpj] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!cnpj || !email || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (cnpj.length !== 14) {
      setError('CNPJ invalido, o CNPJ deve ser somente numeros');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setError('');
      setLoading(true);
      // Registrar no Firebase
      const userCredential = await signup(email, password);
      
      // Após registro no Firebase, criar perfil no backend com CNPJ
      try {
        await createUserProfile({
          firebaseUid: userCredential.user.uid,
          email: email,
          cnpj: cnpj
        });
        navigate('/dashboard');
      } catch (profileError) {
        console.error('Erro ao criar perfil:', profileError);
        setError('Conta criada, mas ocorreu um erro ao salvar os dados do perfil.');
      }
    } catch (error) {
      console.error('Erro no registro:', error.message);
      
      let errorMessage = 'Falha ao criar conta. Tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-form-container">
        <h1 className="register-title">Criar Conta</h1>
        
        {error && <div className="register-error">{error}</div>}
        
        <form onSubmit={handleRegister}>
          <div className="register-input-container">
            <label className="register-label">CNPJ</label>
            <input
              type="number"
              className="register-input"
              placeholder="34444280000160"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              required
            />
          </div>
          
          <div className="register-input-container">
            <label className="register-label">Email</label>
            <input
              type="email"
              className="register-input"
              placeholder="joaosilva@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="register-input-container">
            <label className="register-label">Senha</label>
            <input
              type="password"
              className="register-input"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="register-input-container">
            <label className="register-label">Confirmar Senha</label>
            <input
              type="password"
              className="register-input"
              placeholder="Confirme sua senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit"
            className="register-button"
            disabled={loading}
          >
            {loading ? "Carregando..." : "Registrar"}
          </button>
        </form>
        
        <div className="register-login-container">
          <span className="register-login-text">Já possui uma conta? </span>
          <Link to="/login" className="register-login-link">Entre</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;