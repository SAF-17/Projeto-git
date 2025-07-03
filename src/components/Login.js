import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';

const Login = () => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [pendingRegister, setPendingRegister] = useState(null);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (error) {
      setError('Erro ao autenticar com Google: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        setShowNameModal(true);
        setPendingRegister({ email, password });
        setLoading(false);
        return;
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/');
      }
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleRegisterWithName = async () => {
    if (!registerName.trim()) {
      setError('Por favor, insira o seu nome.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { email, password } = pendingRegister;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, 'Utilizadores', user.uid), {
        email: user.email,
        nome: registerName,
        role: 'user',
      });
      setShowNameModal(false);
      setRegisterName('');
      setPendingRegister(null);
      navigate('/');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxWidth: 370, width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{isRegister ? 'Criar Conta' : 'Login'}</h2>
        <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 4, border: '1px solid #ccc', fontSize: 15 }}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 4, border: '1px solid #ccc', fontSize: 15 }}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 12, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, fontSize: 16, cursor: 'pointer', marginBottom: 8 }}
          >
            {loading ? 'Aguarde...' : isRegister ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ width: '100%', padding: 12, background: '#4285F4', color: 'white', border: 'none', borderRadius: 4, fontSize: 16, cursor: 'pointer', marginBottom: 8 }}
        >
          Entrar com Google
        </button>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 14 }}>
            {isRegister ? 'Já tem conta?' : 'Não tem conta?'}{' '}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#4285F4', cursor: 'pointer', textDecoration: 'underline', fontSize: 14 }}
            >
              {isRegister ? 'Entrar' : 'Criar Conta'}
            </button>
          </span>
        </div>
        {error && <div style={{ color: 'red', marginTop: 12, textAlign: 'center', fontSize: 14 }}>{error}</div>}
      </div>
      {showNameModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            padding: 32,
            minWidth: 340,
            maxWidth: '90vw',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            alignItems: 'center',
            position: 'relative'
          }}>
            <h3 style={{margin: 0, color: '#2563eb', fontWeight: 800}}>Qual o seu nome?</h3>
            <input
              type="text"
              value={registerName}
              onChange={e => setRegisterName(e.target.value)}
              placeholder="Nome completo"
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #ccc', fontSize: 16 }}
              autoFocus
            />
            <button onClick={handleRegisterWithName} style={{marginTop: 16, padding: '10px 32px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer'}}>Criar Conta</button>
            <button onClick={() => { setShowNameModal(false); setLoading(false); }} style={{marginTop: 8, padding: '8px 24px', borderRadius: 8, background: '#f44336', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer'}}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login; 