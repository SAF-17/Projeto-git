import React, { useEffect, useState } from 'react';
import { buscarTodosTrajetos } from '../firebase/firestore';
import { obterCidades } from '../firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useCity } from '../context/CityContext';
import { toast } from 'react-toastify';
import Loading from './Loading';
import StarRating from './StarRating';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';

const Trajetos = () => {
  const [trajetos, setTrajetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();
  const { setSelectedCity } = useCity();
  const [user] = useAuthState(auth);

  useEffect(() => {
    const fetchTrajetos = async () => {
      setLoading(true);
      try {
        const res = await buscarTodosTrajetos();
        // Filtrar apenas os trajetos do utilizador autenticado
        const meus = user ? res.filter(t => t.utilizador === user.email) : [];
        setTrajetos(meus);
        setErro('');
      } catch (e) {
        setErro('Erro ao buscar trajetos.');
        toast.error('Não foi possível carregar os trajetos.');
      } finally {
        setLoading(false);
      }
    };
    fetchTrajetos();
  }, [user]);

  const verNoMapa = async (trajeto) => {
    if (!trajeto.cidade || !trajeto.pontos || trajeto.pontos.length === 0) {
      toast.warn('Este trajeto não tem informação suficiente para ser mostrado no mapa.');
      return;
    }

    // Buscar o objeto completo da cidade
    try {
      const cidades = await obterCidades();
      // O campo cidade pode ser um id ou um objeto
      let cidadeObj = cidades.find(c => c.id === trajeto.cidade || c.nome === trajeto.cidade || c.id === trajeto.cidade.id);
      if (!cidadeObj) {
        // fallback: tenta pelo nome
        cidadeObj = cidades.find(c => c.nome === trajeto.cidade.nome);
      }
      if (!cidadeObj) {
        toast.error('Não foi possível encontrar os dados completos da cidade para este trajeto.');
        return;
      }
      setSelectedCity(cidadeObj);
      navigate('/mapa', { state: { trajetoParaExibir: trajeto } });
      toast.info(`A carregar o trajeto "${trajeto.nome}" no mapa...`);
    } catch (e) {
      toast.error('Erro ao buscar dados da cidade.');
    }
  };

  return (
    <div className="container">
      <h1 style={{ fontSize: '3.2em', color: 'var(--primary)', fontWeight: 900, textShadow: '0 3px 12px rgba(0,0,0,0.18)' }}>Meus Trajetos</h1>
      {loading ? (
        <Loading message="A carregar trajetos..." />
      ) : erro ? (
        <div className="error-message">{erro}</div>
      ) : trajetos.length === 0 ? (
        <div className="info-message">Nenhum trajeto criado ainda.</div>
      ) : (
        <div style={{ overflowX: 'auto',height: '550px', maxHeight: '550px', overflowY: 'auto', marginTop: 24 }}>
          <table className="trajetos-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(37,99,235,0.07)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', position: 'sticky', top: 0, background: '#23623b', color: '#fff', zIndex: 2 }}>Nome</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', position: 'sticky', top: 0, background: '#23623b', color: '#fff', zIndex: 2 }}>Classificação</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', position: 'sticky', top: 0, background: '#23623b', color: '#fff', zIndex: 2 }}>Data</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', position: 'sticky', top: 0, background: '#23623b', color: '#fff', zIndex: 2 }}>Cidade</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', position: 'sticky', top: 0, background: '#23623b', color: '#fff', zIndex: 2 }}># Pontos</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', position: 'sticky', top: 0, background: '#23623b', color: '#fff', zIndex: 2 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {trajetos.map(trajeto => (
                <tr key={trajeto.nome} style={{ background: '#fff', borderBottom: '1.5px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{trajeto.nome}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <StarRating rating={trajeto.averageRating} />
                  </td>
                  <td style={{ padding: '10px 8px', color: '#64748b' }}>{new Date(trajeto.data).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px' }}>{trajeto.cidade}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>{trajeto.pontos?.length || 0}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <button className="trajetos-table-btn" onClick={() => verNoMapa(trajeto)}>Ver no mapa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Trajetos; 