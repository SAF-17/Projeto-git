import React, { useEffect, useState } from 'react';
import { obterCidades, obterPontosTuristicos, atualizarPontoTuristico, deletarPontoTuristico } from '../firebase/firestore';
import { toast } from 'react-toastify';

const ApprovePoints = () => {
  const [pontosPendentes, setPontosPendentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendentes = async () => {
      setLoading(true);
      try {
        const cidades = await obterCidades();
        let pendentes = [];
        for (const cidade of cidades) {
          const pontos = await obterPontosTuristicos(cidade.id);
          pontos.filter(p => p.estado === 'pendente').forEach(p => {
            pendentes.push({ ...p, cidade: cidade.id, distrito: cidade.distrito });
          });
        }
        setPontosPendentes(pendentes);
      } catch (e) {
        toast.error('Erro ao carregar pontos pendentes.');
      } finally {
        setLoading(false);
      }
    };
    fetchPendentes();
  }, []);

  const aprovarPonto = async (ponto) => {
    try {
      await atualizarPontoTuristico(ponto.cidade, ponto.id, { estado: 'aprovado' });
      toast.success(`Ponto "${ponto.nome}" aprovado!`);
      setPontosPendentes(pontosPendentes.filter(p => p.id !== ponto.id || p.cidade !== ponto.cidade));
    } catch (e) {
      toast.error('Erro ao aprovar ponto.');
    }
  };

  const rejeitarPonto = async (ponto) => {
    try {
      await atualizarPontoTuristico(ponto.cidade, ponto.id, { estado: 'rejeitado' });
      toast.info(`Ponto "${ponto.nome}" rejeitado.`);
      setPontosPendentes(pontosPendentes.filter(p => p.id !== ponto.id || p.cidade !== ponto.cidade));
    } catch (e) {
      toast.error('Erro ao rejeitar ponto.');
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h2 style={{ color: 'var(--primary)', fontWeight: 800, marginBottom: 24 }}>Pontos Turísticos Pendentes de Aprovação</h2>
      {loading ? (
        <div>A carregar pontos pendentes...</div>
      ) : pontosPendentes.length === 0 ? (
        <div style={{ color: '#2563eb', fontWeight: 600, fontSize: 18 }}>Nenhum ponto pendente de aprovação.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {pontosPendentes.map((ponto, idx) => (
            <div key={ponto.id + ponto.cidade} style={{ background: '#f4f7fa', borderRadius: 14, boxShadow: '0 2px 8px rgba(37,99,235,0.08)', padding: 18, display: 'flex', alignItems: 'center', gap: 24 }}>
              {ponto.imagem && (
                <img src={ponto.imagem} alt={ponto.nome} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, background: '#e0e7ef' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#2563eb' }}>{ponto.nome}</div>
                <div style={{ color: '#666', fontSize: 15, margin: '6px 0' }}>{ponto.descricao}</div>
                <div style={{ color: '#888', fontSize: 13 }}>Cidade: <b>{ponto.cidade}</b> | Distrito: <b>{ponto.distrito}</b></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => aprovarPonto(ponto)} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Aprovar</button>
                <button onClick={() => rejeitarPonto(ponto)} style={{ background: '#e11d48', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Rejeitar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovePoints; 