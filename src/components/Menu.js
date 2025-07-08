import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useUserRole } from '../hooks/useUserRole';
import { useAuthState } from 'react-firebase-hooks/auth';
import { toast } from 'react-toastify';

const Menu = () => {
    const navigate = useNavigate();
    const { role } = useUserRole();
    const [user] = useAuthState(auth);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate('/');
            toast.success('Logout realizado com sucesso!');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            toast.error('Ocorreu um erro ao fazer logout. Por favor, tente novamente.');
        }
    };

    const handleLogin = () => {
        navigate('/login');
    };

    return (
        <header className="menu">
            <div className="menu-title">TouriTrack</div>
            <nav className="menu-links">
                <NavLink to="/" className="menu-item" end>Início</NavLink>
                <NavLink to="/mapa" className="menu-item">Mapa</NavLink>
                
                {/* Opções apenas para utilizadores autenticados */}
                {user && (
                    <>
                        <NavLink to="/trajetos" className="menu-item">Meus Trajetos</NavLink>
                        <NavLink to="/adicionar-ponto" className="menu-item">Adicionar Ponto</NavLink>
                    </>
                )}
                
                {/* Sobre sempre visível */}
                <NavLink to="/sobre" className="menu-item">Sobre</NavLink>
                
                {/* Admin apenas para admins autenticados */}
                {user && role === 'admin' && <NavLink to="/admin" className="menu-item">Administrador</NavLink>}
                
                {/* Botão de Login/Logout */}
                {user ? (
                    <button onClick={handleLogout} className="menu-item logout-btn">Sair</button>
                ) : (
                    <button 
                        onClick={handleLogin} 
                        className="menu-item login-btn"
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Entrar
                    </button>
                )}
            </nav>
        </header>
    );
};

export default Menu;