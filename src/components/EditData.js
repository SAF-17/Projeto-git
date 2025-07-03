import React, { useState, useEffect } from 'react';
import { obterCidades } from '../firebase/firestore';
import { atualizarTextoSobre, listenTextoSobre } from '../firebase/firestore';
import { toast } from 'react-toastify';

const EditData = () => {
  const [cidades, setCidades] = useState([]);
  const [textoSobre, setTextoSobre] = useState('Saiba mais sobre o TouriTrack.');
  const [cidadePadrao, setCidadePadrao] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCidades = async () => {
      setLoading(true);
      try {
        const cidadesDB = await obterCidades();
        setCidades(cidadesDB);
        // Por enquanto, definir Covilhã como padrão se existir
        const covilha = cidadesDB.find(c => c.id === 'Covilhã');
        if (covilha) {
          setCidadePadrao('Covilhã');
        }
      } catch (e) {
        toast.error('Erro ao carregar cidades');
      } finally {
        setLoading(false);
      }
    };
    fetchCidades();

    // Ouvir texto do Sobre em tempo real
    const unsubscribe = listenTextoSobre(setTextoSobre);
    return () => unsubscribe();
  }, []);

  const handleSaveSobre = async () => {
    try {
      await atualizarTextoSobre(textoSobre);
      toast.success('Texto do "Sobre" atualizado com sucesso!');
    } catch (e) {
      toast.error('Erro ao atualizar texto do "Sobre"');
    }
  };

  const handleSaveCidadePadrao = async () => {
    try {
      // Aqui seria guardado no Firestore
      // Por enquanto, apenas simular
      toast.success('Cidade padrão atualizada com sucesso!');
    } catch (e) {
      toast.error('Erro ao atualizar cidade padrão');
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20 }}>
      <h2 style={{ marginBottom: 32, color: 'var(--primary)', fontSize: '2.4em', fontWeight: 800, textShadow: '0 3px 12px rgba(0,0,0,0.18)' }}>Editar Dados</h2>
      
      {loading && <div>A carregar...</div>}
      
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* Box para editar texto do Sobre */}
        <div style={{
          background: 'rgba(255,255,255,0.85)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          flex: 1,
          minWidth: 400
        }}>
          <h3 style={{ marginBottom: 18, color: 'var(--primary)', fontWeight: 700, fontSize: '1.3em' }}>
            📝 Texto do "Sobre"
          </h3>
          <p style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
            Edite o texto que aparece na página "Sobre" da aplicação.
          </p>
          <textarea
            value={textoSobre}
            onChange={(e) => setTextoSobre(e.target.value)}
            style={{
              width: '100%',
              minHeight: 120,
              padding: 12,
              borderRadius: 8,
              border: '1.5px solid #e0e7ff',
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            placeholder="Digite o texto do 'Sobre'..."
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <div style={{ background: '#d1fae5', borderRadius: 18, padding: '14px 0', boxShadow: '0 2px 8px rgba(37,99,235,0.07)', display: 'flex', justifyContent: 'center', width: '50%' }}>
              <button 
                onClick={handleSaveSobre}
                style={{ 
                  background: 'transparent', 
                  color: '#2563eb', 
                  border: 'none', 
                  borderRadius: 999, 
                  padding: '10px 32px', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  boxShadow: 'none', 
                  fontSize: 16, 
                  transition: 'background 0.18s, color 0.18s',
                  width: '100%'
                }}
              >
                Guardar Texto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditData; 