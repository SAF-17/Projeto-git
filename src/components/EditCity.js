import React, { useEffect, useState } from 'react';
import { obterCidades, atualizarCidade, uploadImage, deletarCidade } from '../firebase/firestore';
import { distritosCidades } from '../firebase/dadosGeograficos';
import { toast } from 'react-toastify';
import AddCity from './AddCity';

const EditCity = () => {
  const [cidades, setCidades] = useState([]);
  const [distritoSelecionado, setDistritoSelecionado] = useState('');
  const [cidadeParaEditar, setCidadeParaEditar] = useState(null);
  const [form, setForm] = useState({ lat: '', lng: '', imageUrl: '', distrito: '', zoom: '' });
  const [loading, setLoading] = useState(false);
  const [showAddCityModal, setShowAddCityModal] = useState(false);
  const [distritoNovo, setDistritoNovo] = useState('');
  const [imagemFicheiro, setImagemFicheiro] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchCidades = async () => {
      setLoading(true);
      try {
        const cidadesDB = await obterCidades();
        setCidades(cidadesDB);
      } catch (e) {
        toast.error('Erro ao carregar cidades');
      } finally {
        setLoading(false);
      }
    };
    fetchCidades();
  }, []);

  const cidadesDoDistrito = distritoSelecionado
    ? cidades.filter(c => c.distrito && c.distrito.trim().toLowerCase() === distritoSelecionado.trim().toLowerCase())
    : [];

  const cidadesDoDistritoNovo = distritoNovo
    ? cidades.filter(c => c.distrito && c.distrito.trim().toLowerCase() === distritoNovo.trim().toLowerCase())
    : [];

  const handleEdit = (cidade) => {
    setCidadeParaEditar(cidade);
    let lat = '', lng = '';
    if (Array.isArray(cidade.coordenadas_centro)) {
      lat = cidade.coordenadas_centro[0] || '';
      lng = cidade.coordenadas_centro[1] || '';
    }
    setForm({
      lat: lat,
      lng: lng,
      imageUrl: '',
      distrito: cidade.distrito || '',
      zoom: cidade.zoom !== undefined ? cidade.zoom : ''
    });
    setImagemFicheiro(null);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImagemChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImagemFicheiro(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!cidadeParaEditar) return;
    if (!form.imageUrl && !imagemFicheiro && !cidadeParaEditar.imageUrl) {
      toast.warn("Por favor, mantenha o link ou carregue uma nova imagem.");
      return;
    }
    setIsUploading(true);
    setLoading(true);
    try {
      let finalImageUrl = form.imageUrl;
      if (imagemFicheiro) {
        finalImageUrl = await uploadImage(imagemFicheiro, 'cidades');
      } else if (!form.imageUrl) {
        finalImageUrl = cidadeParaEditar.imageUrl || '';
      }
      const coords = [parseFloat(form.lat), parseFloat(form.lng)];
      const dados = {
        imageUrl: finalImageUrl,
        coordenadas_centro: coords,
        distrito: form.distrito,
        zoom: Number(form.zoom)
      };
      await atualizarCidade(cidadeParaEditar.id, dados);
      toast.success('Cidade atualizada com sucesso!');
      setCidadeParaEditar(null);
      const cidadesDB = await obterCidades();
      setCidades(cidadesDB);
    } catch (e) {
      toast.error('Erro ao atualizar cidade');
    } finally {
      setIsUploading(false);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!cidadeParaEditar) return;
    if (window.confirm(`Tem certeza que deseja apagar a cidade "${cidadeParaEditar.id}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deletarCidade(cidadeParaEditar.id);
        toast.success('Cidade apagada com sucesso!');
        setCidadeParaEditar(null);
        const cidadesDB = await obterCidades();
        setCidades(cidadesDB);
      } catch (e) {
        toast.error('Erro ao apagar cidade');
      }
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 24 }}>
        <h2 style={{ color: 'var(--primary)', fontSize: '1.8em', fontWeight: 800, marginBottom: 0 }}>Editar Cidade</h2>
        <div style={{ background: '#bfefff', borderRadius: 999, boxShadow: '0 2px 8px rgba(37,99,235,0.15)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 220, alignSelf: 'flex-end', marginLeft: 'auto', marginRight: 0, height: 48 }}>
          <button
            onClick={() => setShowAddCityModal(true)}
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: '#2563eb',
              fontSize: '1em',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 999,
              transition: 'background 0.18s, color 0.18s',
              textDecoration: 'none',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'none',
              padding: 0
            }}
            onMouseOver={e => {
              e.currentTarget.parentNode.style.background = '#2563eb';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={e => {
              e.currentTarget.parentNode.style.background = '#bfefff';
              e.currentTarget.style.color = '#2563eb';
            }}
          >
            + Adicionar Cidade
          </button>
        </div>
      </div>
      {loading && <div>A carregar...</div>}
      <div style={{ display: 'flex', gap: 32, marginBottom: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Selecionar Distrito:
            <select
              value={distritoSelecionado}
              onChange={e => { setDistritoSelecionado(e.target.value); setCidadeParaEditar(null); }}
              style={{
                marginLeft: 12,
                padding: '8px 16px',
                borderRadius: 12,
                border: '1.5px solid var(--primary-light)',
                fontSize: '1em',
                minWidth: 180
              }}
            >
              <option value="">-- Escolha um distrito --</option>
              {Object.keys(distritosCidades).sort().map(distrito => (
                <option key={distrito} value={distrito}>{distrito}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {distritoSelecionado && cidadesDoDistrito.length > 0 && (
        <ul style={{
          display: 'flex', flexWrap: 'wrap', gap: 20, padding: 0, listStyle: 'none',
          maxHeight: 350, overflowY: 'auto', minWidth: 180
        }}>
          {cidadesDoDistrito.length === 0 && <li style={{width: '100%'}}>Nenhuma cidade encontrada na base de dados para este distrito.</li>}
          {cidadesDoDistrito.map(cidade => (
            <li key={cidade.id} style={{
              background: '#f4f7fa',
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              padding: 0,
              width: 170,
              height: 220,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {cidade.imageUrl ? (
                <img src={cidade.imageUrl} alt={cidade.id} style={{ width: '100%', height: 80, objectFit: 'cover', borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
              ) : (
                <div style={{ width: '100%', height: 80, background: '#dbeafe', borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
              )}
              <div style={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '12px 8px'
              }}>
                <div style={{ fontWeight: 600, fontSize: 17, textAlign: 'center' }}>{cidade.id}</div>
                <button
                  onClick={() => handleEdit(cidade)}
                  style={{
                    fontSize: 18,
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    boxShadow: 'none',
                    borderRadius: 999
                  }}
                  aria-label="Editar cidade"
                >✏️</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {cidadeParaEditar && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            padding: 32,
            minWidth: 550,
            maxWidth: '90vw',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            position: 'relative'
          }}>
            <h3 style={{marginTop: 0, marginBottom: 12, fontSize: '1.3em', color: 'var(--primary)', fontWeight: 700}}>Editar dados de {cidadeParaEditar.id}</h3>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: '50%' }}>
                  <label style={{ fontWeight: 500 }}>Latitude:
                    <input name="lat" value={form.lat} onChange={handleChange} placeholder="Ex: 40.123" style={{ width: '100%', marginTop: 4, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
                  </label>
                </div>
                <div style={{ width: '50%' }}>
                  <label style={{ fontWeight: 500 }}>Longitude:
                    <input name="lng" value={form.lng} onChange={handleChange} placeholder="Ex: -7.456" style={{ width: '100%', marginTop: 4, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
                  </label>
                </div>
              </div>
              <label style={{ fontWeight: 500 }}>
                Imagem (URL):
                <input 
                  name="imageUrl" 
                  value={imagemFicheiro ? '' : ''} 
                  onChange={handleChange} 
                  style={{ width: '100%', marginTop: 4, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} 
                  disabled={!!imagemFicheiro}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </label>
              <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 14, fontWeight: 500 }}>OU</div>
              <label style={{ fontWeight: 500 }}>
                Carregar nova imagem:
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImagemChange} 
                  style={{ width: '100%', marginTop: 4 }}
                  disabled={!!form.imageUrl && imagemFicheiro === null}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 18 }}>
                <div style={{ background: '#d1fae5', borderRadius: 18, padding: '14px 0', boxShadow: '0 2px 8px rgba(37,99,235,0.07)', display: 'flex', justifyContent: 'center', width: '50%' }}>
                  <button type="submit" style={{ background: 'transparent', color: '#2563eb', border: 'none', borderRadius: 999, padding: '10px 32px', fontWeight: 700, cursor: 'pointer', boxShadow: 'none', fontSize: 16, transition: 'background 0.18s, color 0.18s', width: '100%' }} disabled={isUploading}>{isUploading ? 'A Guardar...' : 'Guardar'}</button>
                </div>
                <div style={{ background: '#fee2e2', borderRadius: 18, padding: '14px 0', boxShadow: '0 2px 8px rgba(225,29,72,0.07)', display: 'flex', justifyContent: 'center', width: '50%' }}>
                  <button type="button" onClick={handleDelete} style={{ background: 'transparent', color: '#e11d48', border: 'none', borderRadius: 999, padding: '10px 32px', fontWeight: 600, cursor: 'pointer', boxShadow: 'none', fontSize: 16, transition: 'background 0.18s, color 0.18s', width: '100%' }}>Apagar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAddCityModal && (
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
          zIndex: 1000
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
            position: 'relative'
          }}>
            <h3 style={{marginTop: 0, marginBottom: 12, fontSize: '1.3em', color: 'var(--primary)', fontWeight: 700}}>Adicionar Cidade</h3>
            <AddCity onCancel={() => setShowAddCityModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EditCity; 