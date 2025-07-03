import React, { useEffect, useState } from 'react';
import { obterCidades, obterPontosTuristicos, atualizarPontoTuristico, adicionarPontoTuristico, deletarPontoTuristico, uploadImage } from '../firebase/firestore';
import { distritosCidades } from '../firebase/dadosGeograficos';
import { toast } from 'react-toastify';
import { AdicionarPontoForm } from './AdicionarPonto';

const EditPoint = () => {
  const [cidades, setCidades] = useState([]);
  const [distritoSelecionado, setDistritoSelecionado] = useState('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState('');
  const [pontos, setPontos] = useState([]);
  const [pontoParaEditar, setPontoParaEditar] = useState(null);
  const [form, setForm] = useState({ nome_ponto: '', info_ponto: '', img_link_ponto: '', lat: '', lng: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ nome_ponto: '', info_ponto: '', img_link_ponto: '', lat: '', lng: '' });
  const [imagemFicheiro, setImagemFicheiro] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  useEffect(() => {
    obterCidades()
      .then(cidadesDB => setCidades(cidadesDB))
      .catch(error => {
        console.error('Erro ao buscar cidades:', error);
        setCidades([]);
      });
  }, []);

  const cidadesDoDistrito = distritoSelecionado
    ? cidades.filter(c => c.distrito && c.distrito.trim().toLowerCase() === distritoSelecionado.trim().toLowerCase())
    : [];

  useEffect(() => {
    if (cidadeSelecionada) {
      const fetchPontos = async () => {
        try {
          const pontosDB = await obterPontosTuristicos(cidadeSelecionada);
          setPontos(pontosDB);
        } catch (e) {
          toast.error('Erro ao carregar pontos turísticos');
        }
      };
      fetchPontos();
    } else {
      setPontos([]);
    }
  }, [cidadeSelecionada]);

  const handleEdit = (ponto) => {
    setPontoParaEditar(ponto);
    let lat = '', lng = '';
    if (Array.isArray(ponto.coordenadas)) {
      lat = ponto.coordenadas[0] || '';
      lng = ponto.coordenadas[1] || '';
    } else if (ponto.coordenadas_ponto && typeof ponto.coordenadas_ponto === 'string') {
      const parts = ponto.coordenadas_ponto.split(',');
      lat = parts[0] || '';
      lng = parts[1] || '';
    }
    setForm({
      nome_ponto: ponto.nome_ponto || ponto.nome || ponto.id || '',
      info_ponto: ponto.info_ponto || ponto.descricao || '',
      img_link_ponto: '',
      lat: lat,
      lng: lng
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
    if (!pontoParaEditar) return;
    if (!form.img_link_ponto && !imagemFicheiro && !pontoParaEditar.img_link_ponto && !pontoParaEditar.imagem) {
      toast.warn("Por favor, mantenha o link ou carregue uma nova imagem.");
      return;
    }
    setIsUploading(true);
    try {
      let finalImageUrl = form.img_link_ponto;
      if (imagemFicheiro) {
        finalImageUrl = await uploadImage(imagemFicheiro, `pontos_turisticos/${cidadeSelecionada}`);
      } else if (!form.img_link_ponto) {
        finalImageUrl = pontoParaEditar.img_link_ponto || pontoParaEditar.imagem || '';
      }
      const coords = [parseFloat(form.lat), parseFloat(form.lng)];
      const dados = {
        nome_ponto: form.nome_ponto,
        info_ponto: form.info_ponto,
        img_link_ponto: finalImageUrl,
        coordenadas_ponto: coords
      };
      if (form.nome_ponto !== pontoParaEditar.nome_ponto && form.nome_ponto !== pontoParaEditar.nome && form.nome_ponto !== pontoParaEditar.id) {
        // Nome mudou: criar novo doc, apagar antigo
        await adicionarPontoTuristico(dados, distritoSelecionado, cidadeSelecionada);
        await deletarPontoTuristico(cidadeSelecionada, pontoParaEditar.id);
      } else {
        // Nome igual: só atualizar
        await atualizarPontoTuristico(cidadeSelecionada, pontoParaEditar.id, dados);
      }
      toast.success('Ponto turístico atualizado com sucesso!');
      setPontoParaEditar(null);
      // Atualizar lista
      const pontosDB = await obterPontosTuristicos(cidadeSelecionada);
      setPontos(pontosDB);
    } catch (e) {
      toast.error('Erro ao atualizar ponto turístico');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!pontoParaEditar) return;
    
    if (window.confirm(`Tem certeza que deseja apagar o ponto "${pontoParaEditar.nome_ponto || pontoParaEditar.nome || pontoParaEditar.id}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deletarPontoTuristico(cidadeSelecionada, pontoParaEditar.id);
        setPontoParaEditar(null);
        setShowDeleteSuccess(true);
        // Atualizar lista
        const pontosDB = await obterPontosTuristicos(cidadeSelecionada);
        setPontos(pontosDB);
      } catch (e) {
        toast.error('Erro ao apagar ponto turístico');
      }
    }
  };

  const handleDistritoChange = (e) => {
    setDistritoSelecionado(e.target.value);
    setCidadeSelecionada('');
    setPontoParaEditar(null);
    setPontos([]);
  };

  const handleCidadeChange = (e) => {
    setCidadeSelecionada(e.target.value);
    setPontoParaEditar(null);
  };

  const handleAddChange = (e) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  const handleAddSave = async () => {
    try {
      const coords = [parseFloat(addForm.lat), parseFloat(addForm.lng)];
      const dados = {
        nome_ponto: addForm.nome_ponto,
        info_ponto: addForm.info_ponto,
        img_link_ponto: addForm.img_link_ponto,
        coordenadas_ponto: coords
      };
      await adicionarPontoTuristico(dados, distritoSelecionado, cidadeSelecionada);
      toast.success('Ponto turístico adicionado com sucesso!');
      setShowAddModal(false);
      setAddForm({ nome_ponto: '', info_ponto: '', img_link_ponto: '', lat: '', lng: '' });
      // Atualizar lista
      const pontosDB = await obterPontosTuristicos(cidadeSelecionada);
      setPontos(pontosDB);
    } catch (e) {
      toast.error('Erro ao adicionar ponto turístico');
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20 }}>
      {pontoParaEditar ? (
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
            <h3 style={{marginTop: 0, marginBottom: 18, fontSize: '2em', color: 'var(--primary)', fontWeight: 800}}>Editar ponto: {form.nome_ponto}</h3>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ fontWeight: 500 }}>
                Nome:
                <input name="nome_ponto" value={form.nome_ponto} onChange={handleChange} style={{ width: '100%', marginTop: 4, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
              </label>
              <div style={{ marginBottom: 8, fontWeight: 500 }}><b>Coordenadas</b></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: '50%' }}>
                  <label style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Latitude</label>
                  <input name="lat" value={form.lat} onChange={handleChange} placeholder="Latitude" style={{ width: '100%', marginTop: 4, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
                <div style={{ width: '50%' }}>
                  <label style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Longitude</label>
                  <input name="lng" value={form.lng} onChange={handleChange} placeholder="Longitude" style={{ width: '100%', marginTop: 4, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
              </div>
              <label style={{ fontWeight: 500 }}>
                Descrição:
                <input name="info_ponto" value={form.info_ponto} onChange={handleChange} style={{ width: '100%', marginTop: 4, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
              </label>
              <label style={{ fontWeight: 500 }}>
                Imagem (URL):
                <input 
                  name="img_link_ponto" 
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
                  disabled={!!form.img_link_ponto && imagemFicheiro === null}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 18 }}>
                <div style={{ background: '#d1fae5', borderRadius: 18, padding: '14px 0', boxShadow: '0 2px 8px rgba(37,99,235,0.07)', display: 'flex', justifyContent: 'center', flex: 1 }}>
                  <button type="submit" style={{ background: 'transparent', color: '#2563eb', border: 'none', borderRadius: 999, padding: '10px 32px', fontWeight: 700, cursor: 'pointer', boxShadow: 'none', fontSize: 16, transition: 'background 0.18s, color 0.18s' }} disabled={isUploading}>{isUploading ? 'A Guardar...' : 'Guardar'}</button>
                </div>
                <div style={{ background: '#fee2e2', borderRadius: 18, padding: '14px 0', boxShadow: '0 2px 8px rgba(239,68,68,0.07)', display: 'flex', justifyContent: 'center', flex: 1 }}>
                  <button type="button" onClick={handleDelete} style={{ background: 'transparent', color: '#dc2626', border: 'none', borderRadius: 999, padding: '10px 32px', fontWeight: 700, cursor: 'pointer', boxShadow: 'none', fontSize: 16, transition: 'background 0.18s, color 0.18s' }}>Apagar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 24 }}>
            <h2 style={{ marginBottom: 0, color: 'var(--primary)', fontSize: '1.8em', fontWeight: 800 }}>Editar Ponto Turístico</h2>
            {cidadeSelecionada && (
              <div style={{ background: '#bfefff', borderRadius: 999, boxShadow: '0 2px 8px rgba(37,99,235,0.15)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 220, alignSelf: 'flex-end', marginLeft: 'auto', marginRight: 0, height: 48 }}>
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'transparent !important',
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
                  Adicionar Ponto Turístico
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 32, marginBottom: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Selecionar Distrito:
                <select
                  value={distritoSelecionado}
                  onChange={handleDistritoChange}
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Selecionar Cidade:
                <select
                  value={cidadeSelecionada}
                  onChange={handleCidadeChange}
                  style={{
                    marginLeft: 12,
                    padding: '8px 16px',
                    borderRadius: 12,
                    border: '1.5px solid var(--primary-light)',
                    fontSize: '1em',
                    minWidth: 180
                  }}
                  disabled={!distritoSelecionado || cidadesDoDistrito.length === 0}
                >
                  <option value="">-- Escolha uma cidade --</option>
                  {cidadesDoDistrito.map(cidade => (
                    <option key={cidade.id} value={cidade.id}>{cidade.id}</option>
                  ))}
                </select>
              </label>
              {!distritoSelecionado && (
                <div style={{ color: '#888', fontSize: 13, marginTop: 2, marginLeft: 0 }}>Escolha primeiro um distrito</div>
              )}
              {distritoSelecionado && cidadesDoDistrito.length === 0 && (
                <div style={{ color: '#e11d48', fontSize: 13, marginTop: 2, marginLeft: 0 }}>Nenhuma cidade encontrada no distrito {distritoSelecionado}.</div>
              )}
            </div>
          </div>
          {cidadeSelecionada && (
            <div>
              <h3 style={{ marginBottom: 18, color: 'var(--primary)', fontWeight: 700 }}>Pontos turísticos em {cidadesDoDistrito.find(c => c.id === cidadeSelecionada)?.nome || cidadeSelecionada}:</h3>
              <ul style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                gridAutoRows: '220px',
                gap: 20,
                padding: 0,
                listStyle: 'none',
                maxHeight: 480,
                minHeight: 220,
                overflowY: 'auto',
                minWidth: 180,
                gridTemplateRows: 'repeat(2, 220px)',
              }}>
                {pontos.length === 0 && <li style={{width: '100%'}}>Nenhum ponto encontrado para esta cidade.</li>}
                {pontos.map(ponto => (
                  <li key={ponto.id} style={{
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
                    {ponto.img_link_ponto || ponto.imagem ? (
                      <img src={ponto.img_link_ponto || ponto.imagem} alt={ponto.nome_ponto || ponto.nome || ponto.id} style={{ width: '100%', height: 80, objectFit: 'cover', borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
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
                      <div style={{ fontWeight: 600, fontSize: 17, textAlign: 'center' }}>{ponto.nome_ponto || ponto.nome || ponto.id}</div>
                      <button
                        onClick={() => handleEdit(ponto)}
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
                        aria-label="Editar ponto"
                      >✏️</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {showAddModal && (
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
                <AdicionarPontoForm
                  distrito={distritoSelecionado}
                  cidade={cidadeSelecionada}
                  onSuccess={async () => {
                    setShowAddModal(false);
                    const pontosDB = await obterPontosTuristicos(cidadeSelecionada);
                    setPontos(pontosDB);
                  }}
                />
                <button onClick={() => setShowAddModal(false)} style={{marginTop: 18, alignSelf: 'center', background: '#e11d48', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 32px', fontWeight: 600, cursor: 'pointer'}}>Cancelar</button>
              </div>
            </div>
          )}
          {showDeleteSuccess && (
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
                <h3 style={{margin: 0, color: '#dc2626', fontWeight: 800}}>Ponto turístico apagado com sucesso!</h3>
                <button onClick={() => setShowDeleteSuccess(false)} style={{marginTop: 16, padding: '10px 32px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer'}}>Fechar</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EditPoint; 