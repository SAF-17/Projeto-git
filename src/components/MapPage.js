import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPage_estilos.css';
import L from 'leaflet';
import { obterPontosTuristicos, guardarTrajeto, saveFeedback, uploadFeedbackPhoto, updateTrajetoRating, updatePontoTuristicoRating, listenPontosTuristicos } from '../firebase/firestore';
import pinIconUrl from '../img/pin.png';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';
import { toast } from 'react-toastify';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useCity } from '../context/CityContext';
import { Navigate, useLocation } from 'react-router-dom';
import StarRating from './StarRating';

const pinIcon = new L.Icon({
  iconUrl: pinIconUrl,
  iconSize: [20, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -35],
  className: '',
});

const MapPage = () => {
  const { selectedCity } = useCity();
  const [pontosTuristicos, setPontosTuristicos] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [route, setRoute] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPontos, setIsLoadingPontos] = useState(true);
  const [optimizedPoints, setOptimizedPoints] = useState([]);
  const [user] = useAuthState(auth);
  const [showModal, setShowModal] = useState(false);
  const [trajetoNome, setTrajetoNome] = useState('');
  const [pendingTrajeto, setPendingTrajeto] = useState(null);
  const location = useLocation();
  const [showStartModal, setShowStartModal] = useState(false);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [feedbacks, setFeedbacks] = useState([]);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [rotaCriada, setRotaCriada] = useState(false);
  const [showOverallFeedbackModal, setShowOverallFeedbackModal] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [overallComment, setOverallComment] = useState("");
  const [mapResetKey, setMapResetKey] = useState(Date.now());

  // 1. Criar a função para recarregar os pontos
  const fetchAndSetPoints = async () => {
    if (!selectedCity) return;
    setIsLoadingPontos(true);
    try {
      const pontos = await obterPontosTuristicos(selectedCity.id);
      const pontosOrdenados = pontos.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
      setPontosTuristicos(pontosOrdenados);
    } catch (error) {
      console.error('Erro ao carregar pontos turísticos:', error);
      toast.error('Não foi possível carregar os pontos turísticos.');
    } finally {
      setIsLoadingPontos(false);
    }
  };

  useEffect(() => {
    setSelecionados([]);
    setRoute([]);
    setOptimizedPoints([]);

    let unsubscribe = null;

    const carregarDados = async () => {
      if (location.state?.trajetoParaExibir) {
        // Carregar trajeto específico
        const { trajetoParaExibir } = location.state;
        setTrajetoNome(trajetoParaExibir.nome || '');
        setSelecionados(trajetoParaExibir.pontos.map(p => p.nome));
        
        const pontosCompletos = trajetoParaExibir.pontos.map(p => ({
          id: p.nome,
          nome: p.nome,
          coordenadas: p.coordenadas,
          imagem: p.imagem || null,
          descricao: p.descricao || '',
        }));
        
        setPontosTuristicos(pontosCompletos);
        setOptimizedPoints(pontosCompletos);
        setRotaCriada(true);

        const coordenadasDoTrajeto = pontosCompletos.map(p => p.coordenadas);
        const rotaCalculada = await getRouteCoordinates(coordenadasDoTrajeto);
        if(rotaCalculada) {
            setRoute(rotaCalculada);
        } else {
            toast.warn("Não foi possível calcular a rota para o trajeto. Apenas os pontos serão exibidos.");
        }
        
        setIsLoadingPontos(false);
      } else if (selectedCity) {
        // Carregar pontos turísticos em tempo real
        setIsLoadingPontos(true);
        unsubscribe = listenPontosTuristicos(selectedCity.id, (pontos) => {
          const pontosOrdenados = pontos.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
          setPontosTuristicos(pontosOrdenados);
          setIsLoadingPontos(false);
        });
      } else {
        // Se não há cidade selecionada, mostrar mensagem
        setPontosTuristicos([]);
        setIsLoadingPontos(false);
        toast.info('Por favor, selecione uma cidade para ver os pontos turísticos.');
      }
    };

    carregarDados();
    return () => {
      if (unsubscribe) unsubscribe();
      if (location.state?.trajetoParaExibir) {
        window.history.replaceState({}, document.title)
      }
    };
  }, [selectedCity, location.state]);

  useEffect(() => {
    if (pendingTrajeto && pendingTrajeto.length > 1) {
      setStartPoint(pendingTrajeto[0]?.nome);
      setEndPoint(pendingTrajeto[pendingTrajeto.length - 1]?.nome);
    }
  }, [pendingTrajeto]);

  const handleCheckboxChange = (ponto) => {
    setSelecionados((prev) =>
      prev.includes(ponto) ? prev.filter((item) => item !== ponto) : [...prev, ponto]
    );
  };

  const getRouteCoordinates = async (coordinates) => {
    try {
      if (coordinates.length < 2) throw new Error('São necessários pelo menos 2 pontos para gerar uma rota');
      const coordinatesString = coordinates.map(coord => `${coord[1]},${coord[0]}`).join(';');
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/foot/${coordinatesString}?overview=full&geometries=geojson`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      } else {
        throw new Error('Falha ao obter rota: Resposta inválida do OSRM');
      }
    } catch (error) {
      console.error('Erro ao buscar rota:', error);
      return null;
    }
  };

  // Função para calcular a distância entre dois pontos [lat, lng]
  function haversineDistance(a, b) {
    const toRad = deg => deg * Math.PI / 180;
    const R = 6371; // km
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const aVal = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(aVal));
  }

  // Resolve TSP com início e fim fixos (força bruta para <=8 pontos, heurística para mais)
  function optimizeRoute(points) {
    if (points.length <= 2) return points;
    const start = points[0];
    const end = points[points.length-1];
    const middle = points.slice(1, -1);
    // Força bruta para poucos pontos
    if (middle.length <= 6) {
      const permute = arr => arr.length === 0 ? [[]] : arr.flatMap((v,i) => permute(arr.slice(0,i).concat(arr.slice(i+1))).map(p => [v,...p]));
      let best = null, bestDist = Infinity;
      for (const perm of permute(middle)) {
        const route = [start, ...perm, end];
        let dist = 0;
        for (let i=0; i<route.length-1; ++i) dist += haversineDistance(route[i].coordenadas, route[i+1].coordenadas);
        if (dist < bestDist) { bestDist = dist; best = route; }
      }
      return best;
    } else {
      // Heurística: Nearest Neighbor
      let route = [start], left = [...middle];
      let curr = start;
      while (left.length) {
        let idx = 0, minDist = haversineDistance(curr.coordenadas, left[0].coordenadas);
        for (let i=1; i<left.length; ++i) {
          const d = haversineDistance(curr.coordenadas, left[i].coordenadas);
          if (d < minDist) { minDist = d; idx = i; }
        }
        curr = left[idx];
        route.push(curr);
        left.splice(idx,1);
      }
      route.push(end);
      return route;
    }
  }

  const generateRoute = async () => {
    if (selecionados.length < 2) {
      toast.warn('Por favor, selecione pelo menos 2 pontos para gerar uma rota');
      return;
    }
    setIsLoading(true);
    try {
      const selectedPoints = selecionados.map(nome => pontosTuristicos.find(ponto => ponto.nome === nome)).filter(Boolean);
      if (selectedPoints.length < 2) throw new Error('Não foi possível encontrar todos os pontos selecionados');
      const optimized = optimizeRoute(selectedPoints);
      setOptimizedPoints(optimized);
      const coordinates = optimized.map(ponto => ponto.coordenadas);
      const routeCoordinates = await getRouteCoordinates(coordinates);
      if (routeCoordinates) setRoute(routeCoordinates);
      else throw new Error('Não foi possível gerar a rota');
      // Mostrar modal para nome do trajeto
      setPendingTrajeto(optimized);
      setTrajetoNome('');
      setShowModal(true);
    } catch (error) {
      toast.error(`Erro ao gerar rota: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTrajeto = async () => {
    if (!trajetoNome.trim()) {
      toast.warn('Por favor, insira um nome para o trajeto.');
      return;
    }
    if (user && user.email && pendingTrajeto) {
      try {
        const pontos = pendingTrajeto.map(p => ({
          nome: p.nome,
          coordenadas: p.coordenadas,
          imagem: p.imagem || null,
          descricao: p.descricao || '',
        }));
        await guardarTrajeto({
          nome: trajetoNome.trim(),
          pontos,
          utilizador: user.email,
          cidade: selectedCity.id,
        });
        toast.success('Trajeto guardado com sucesso!');
        setTrajetoNome(trajetoNome.trim());
        setSelecionados(pontos.map(p => p.nome));
        setOptimizedPoints(pontos);
        const coordinates = pontos.map(p => p.coordenadas);
        const routeCoordinates = await getRouteCoordinates(coordinates);
        setRoute(routeCoordinates || []);
        setShowModal(false);
        setPendingTrajeto(null);
        setRotaCriada(true);
      } catch (error) {
        toast.error('Erro ao guardar trajeto: ' + error.message);
      }
    } else {
      toast.error('Trajeto não foi guardado (utilizador não autenticado).');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPendingTrajeto(null);
    setTrajetoNome('');
  };

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const getDisplayName = (nome) => {
    if (selecionados.length === 0) return nome;
    const index = selecionados.indexOf(nome);
    if (index === 0) return `${nome} 🏁`;
    if (index === selecionados.length - 1) return `${nome} 🎯`;
    return nome;
  };

  const openInGoogleMaps = () => {
    if (route.length === 0 || optimizedPoints.length === 0) {
      toast.info('Por favor, gere uma rota primeiro');
      return;
    }
    const points = optimizedPoints;
    const origin = points[0].coordenadas;
    const destination = points[points.length - 1].coordenadas;
    const baseUrl = 'https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=';
    const originStr = `${origin[0]},${origin[1]}`;
    const destinationStr = `${destination[0]},${destination[1]}`;
    const waypoints = points.slice(1, -1).map(ponto => `${ponto.coordenadas[0]},${ponto.coordenadas[1]}`).join('|');
    const googleMapsUrl = `${baseUrl}${originStr}&destination=${destinationStr}&waypoints=${waypoints}`;
    window.open(googleMapsUrl, '_blank');
  };

  const handleStartRoute = () => {
    setShowStartModal(true);
    setCurrentPointIndex(0);
    setComment("");
    setRating(0);
    setPhoto(null);
    setPhotoPreview(null);
    setFeedbacks([]);
  };

  const handleCloseStartModal = () => {
    setShowStartModal(false);
    setComment("");
    setRating(0);
    setPhoto(null);
    setPhotoPreview(null);
    setCurrentPointIndex(0);
    setFeedbacks([]);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    setPhoto(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    const ponto = optimizedPoints[currentPointIndex];
    // Adicionar o feedback ao array (incluindo o ficheiro da foto, não o preview)
    const feedback = {
      pontoId: ponto?.id || ponto?.nome,
      pontoNome: ponto?.nome,
      comentario: comment,
      avaliacao: rating,
      photoFile: photo, // Guardar o ficheiro para upload posterior
    };
    setFeedbacks(prev => {
      const updated = [...prev];
      updated[currentPointIndex] = feedback;
      return updated;
    });
    // Limpar campos para o próximo ponto
    setComment("");
    setRating(0);
    setPhoto(null);
    setPhotoPreview(null);
    // Lógica para trajetos circulares
    const isCircular = optimizedPoints.length > 2 && optimizedPoints[0].nome === optimizedPoints[optimizedPoints.length - 1].nome;
    const isLastPoint = currentPointIndex === optimizedPoints.length - 1;
    // Se for circular e estamos no penúltimo ponto, terminar sem pedir feedback do último (que é igual ao primeiro)
    if (isCircular && currentPointIndex === optimizedPoints.length - 2) {
      setShowStartModal(false);
      setShowOverallFeedbackModal(true);
      return;
    }
    // Se não for circular, terminar no último ponto normalmente
    if (isLastPoint) {
      setShowStartModal(false);
      setShowOverallFeedbackModal(true);
      return;
    }
    // Avançar para o próximo ponto
    setCurrentPointIndex(currentPointIndex + 1);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userId = user?.email || 'anonimo';
      
      // 1. Fazer upload das fotos e obter os URLs
      const pontosFeedbackComUrls = await Promise.all(
        feedbacks.map(async (feedback) => {
          let photoUrl = null;
          if (feedback.photoFile) {
            photoUrl = await uploadFeedbackPhoto(feedback.photoFile, userId);
          }
          return {
            pontoNome: feedback.pontoNome,
            comentario: feedback.comentario,
            avaliacao: feedback.avaliacao,
            fotoUrl: photoUrl,
          };
        })
      );

      // 2. Preparar o documento final
      const feedbackData = {
        userId,
        trajetoNome,
        trajetoAvaliacao: overallRating,
        trajetoComentario: overallComment,
        pontos: pontosFeedbackComUrls, // Array com feedback de cada ponto
      };

      // 3. Guardar no Firestore
      await saveFeedback(feedbackData);

      // 4. Atualizar a classificação do TRAJETO
      await updateTrajetoRating(trajetoNome, overallRating);

      // 5. Atualizar a classificação de CADA PONTO TURÍSTICO
      await Promise.all(
        feedbacks.map(feedback => {
          if(feedback.avaliacao > 0) { // Só atualiza se houver avaliação
            return updatePontoTuristicoRating(selectedCity.id, feedback.pontoNome, feedback.avaliacao);
          }
          return null;
        })
      );

      toast.success('Obrigado pelo seu feedback!');
      
      // Recarregar os pontos para mostrar a nova classificação
      await fetchAndSetPoints(); 

      // 3. Atualizar a key para forçar a recriação do mapa
      setMapResetKey(Date.now());

    } catch (error) {
      toast.error('Ocorreu um erro ao guardar o seu feedback.');
      console.error(error);
    } finally {
      setIsLoading(false);
      setShowOverallFeedbackModal(false);
      // Limpar tudo
      setCurrentPointIndex(0);
      setFeedbacks([]);
      setOverallRating(0);
      setOverallComment("");
    }
  };

  const handleStartEndChange = (newStart, newEnd) => {
    if (!pendingTrajeto) return;
    // Reotimizar pontos intermédios
    const allPoints = [...pendingTrajeto];
    const startObj = allPoints.find(p => p.nome === newStart);
    const endObj = allPoints.find(p => p.nome === newEnd);
    const middle = allPoints.filter(p => p.nome !== newStart && p.nome !== newEnd);
    // Reutilizar a função optimizeRoute apenas para os pontos intermédios
    let optimizedMiddle = middle;
    if (middle.length > 1) {
      optimizedMiddle = optimizeRoute([middle[0], ...middle.slice(1)]).filter(p => p);
    }
    const newRoute = [startObj, ...optimizedMiddle, endObj];
    setPendingTrajeto(newRoute);
    setStartPoint(newStart);
    setEndPoint(newEnd);
  };

  // Função para abrir o modal de edição
  const handleEditarRota = () => {
    setShowModal(true);
    setPendingTrajeto([...optimizedPoints]);
    setTrajetoNome(trajetoNome);
    setStartPoint(optimizedPoints[0]?.nome);
    setEndPoint(optimizedPoints[optimizedPoints.length - 1]?.nome);
  };

  if (!selectedCity) {
    return <Navigate to="/" replace />;
  }

  let center;
  if (selectedCity.coordenadas_centro && Array.isArray(selectedCity.coordenadas_centro)) {
    center = selectedCity.coordenadas_centro;
  } else if (selectedCity.coordenadas_centro && typeof selectedCity.coordenadas_centro.latitude === 'number') {
    center = [selectedCity.coordenadas_centro.latitude, selectedCity.coordenadas_centro.longitude];
  } else if (location.state?.trajetoParaExibir?.pontos?.[0]?.coordenadas) {
    center = location.state.trajetoParaExibir.pontos[0].coordenadas;
  } else {
    console.error("Não foi possível determinar o centro do mapa.");
    toast.error("Não há informação de centro para esta cidade. A redirecionar...");
    return <Navigate to="/" replace />;
  }
  
  const { zoom = 13 } = selectedCity;

  return (
    <>
      {showStartModal && (
        <div className="start-modal-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="start-modal-content" style={{ background: '#fff', borderRadius: 18, padding: 32, maxWidth: 600, width: '95%', boxShadow: '0 4px 32px rgba(0,0,0,0.18)', position: 'relative', textAlign: 'center' }}>
            <button onClick={handleCloseStartModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>&times;</button>
            <h2 style={{ color: '#2563eb', marginBottom: 8 }}>{trajetoNome ? `Trajeto — "${trajetoNome}"` : ''}</h2>
            <h3 style={{ color: '#2563eb', marginBottom: 18 }}>Ponto {currentPointIndex + 1} de {optimizedPoints.length}</h3>
            <h4 style={{ color: '#222', marginBottom: 10 }}>{optimizedPoints[currentPointIndex]?.nome}</h4>
            {/* Imagem do ponto atual */}
            {optimizedPoints[currentPointIndex]?.imagem ? (
              <img src={optimizedPoints[currentPointIndex].imagem} alt="Imagem do local" style={{ width: '100%', maxWidth: 420, height: 220, objectFit: 'cover', borderRadius: 12, marginBottom: 18, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
            ) : (
              <div style={{ width: '100%', maxWidth: 420, height: 220, background: '#e0e7ef', borderRadius: 12, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', marginLeft: 'auto', marginRight: 'auto' }}>
                Sem imagem disponível
              </div>
            )}
            <form onSubmit={handleSubmitFeedback}>
              <div style={{ marginBottom: 18 }}>
                <textarea
                  placeholder="Comentário sobre o local..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  style={{ width: '100%', minHeight: 60, borderRadius: 8, border: '1px solid #cbd5e1', padding: 10, fontSize: 15 }}
                  required={rating === 1 || rating === 2}
                />
                {(rating === 1 || rating === 2) && !comment && (
                  <div style={{ color: '#e11d48', fontSize: 14, marginTop: 4 }}>Indique o motivo da sua avaliação.</div>
                )}
              </div>
              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {[0,1,2,3,4].map(i => (
                  <span
                    key={i}
                    style={{ fontSize: 28, cursor: 'pointer', color: i < rating ? '#fbbf24' : '#cbd5e1' }}
                    onClick={() => setRating(i+1)}
                    role="button"
                    aria-label={`Avaliar com ${i+1} estrelas`}
                  >
                    ★
                  </span>
                ))}
                <span style={{ marginLeft: 8, fontWeight: 500, color: '#2563eb' }}>{rating} / 5</span>
              </div>
              <div style={{ marginBottom: 18 }}>
                <input type="file" accept="image/*" onChange={handlePhotoChange} key={currentPointIndex} />
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" style={{ width: '100%', maxWidth: 420, height: 180, objectFit: 'cover', borderRadius: 8, marginTop: 8, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  type="submit"
                  style={{
                    background: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 38px',
                    fontWeight: 700,
                    fontSize: 19,
                    cursor: ((rating === 1 || rating === 2) ? !!comment : rating > 0) ? 'pointer' : 'not-allowed',
                    marginTop: 8,
                    transition: 'background 0.2s',
                    opacity: ((rating === 1 || rating === 2) ? !!comment : rating > 0) ? 1 : 0.7
                  }}
                  disabled={((rating === 1 || rating === 2) ? !comment : rating === 0)}
                >
                  {currentPointIndex < optimizedPoints.length - 1 ? 'Avançar' : 'Concluir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showModal && (
        <div className="trajeto-modal-bg" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="trajeto-modal" style={{
            background: '#fff', borderRadius: 18, padding: 32, maxWidth: 600, width: '100%', boxShadow: '0 4px 32px rgba(0,0,0,0.18)', position: 'relative', textAlign: 'center'
          }}>
            <button onClick={handleCloseModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>&times;</button>
            <h2 style={{ color: '#2563eb', marginBottom: 18 }}>Guardar Trajeto</h2>
            <input
              type="text"
              placeholder="Nome do trajeto"
              value={trajetoNome}
              onChange={e => setTrajetoNome(e.target.value)}
              className="trajeto-modal-input"
              autoFocus
              style={{ width: '100%', marginBottom: 18, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16 }}
            />
            {pendingTrajeto && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ marginBottom: 8 }}>
                  <b>Início:</b>
                  <select
                    value={startPoint || pendingTrajeto[0]?.nome}
                    onChange={e => handleStartEndChange(e.target.value, endPoint || pendingTrajeto[pendingTrajeto.length - 1]?.nome)}
                    style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    {pendingTrajeto.map((p, idx) => (
                      <option key={p.nome + '-' + idx} value={p.nome}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <b>Fim:</b>
                  <select
                    value={endPoint || pendingTrajeto[pendingTrajeto.length - 1]?.nome}
                    onChange={e => handleStartEndChange(startPoint || pendingTrajeto[0]?.nome, e.target.value)}
                    style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    {pendingTrajeto.map((p, idx) => (
                      <option key={p.nome + '-' + idx} value={p.nome}>{p.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="trajeto-modal-actions" style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button
                onClick={handleSaveTrajeto}
                className="trajeto-modal-btn"
                style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 17, cursor: !trajetoNome ? 'not-allowed' : 'pointer' }}
                disabled={!trajetoNome}
              >
                Guardar
              </button>
              <button onClick={handleCloseModal} className="trajeto-modal-btn cancel" style={{ background: '#e11d48', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 17, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {showOverallFeedbackModal && (
        <div className="overall-feedback-modal-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="overall-feedback-modal-content" style={{ background: '#fff', borderRadius: 18, padding: 32, maxWidth: 600, width: '95%', textAlign: 'center' }}>
            <h2 style={{ color: '#2563eb', marginBottom: 18 }}>Feedback Final do Trajeto</h2>
            <form onSubmit={handleFinalSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Avaliação geral da experiência:</label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {[0,1,2,3,4].map(i => (
                    <span key={i} style={{ fontSize: 32, cursor: 'pointer', color: i < overallRating ? '#fbbf24' : '#cbd5e1' }} onClick={() => setOverallRating(i+1)}>★</span>
                  ))}
                  <span style={{ marginLeft: 8, fontWeight: 500, color: '#2563eb' }}>{overallRating} / 5</span>
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Deixe um comentário sobre o trajeto:</label>
                <textarea
                  placeholder="A sua opinião é importante..."
                  value={overallComment}
                  onChange={e => setOverallComment(e.target.value)}
                  style={{ width: '100%', minHeight: 80, borderRadius: 8, border: '1px solid #cbd5e1', padding: 10, fontSize: 15 }}
                  required={overallRating === 1 || overallRating === 2}
                />
                {(overallRating === 1 || overallRating === 2) && !overallComment && (
                  <div style={{ color: '#e11d48', fontSize: 14, marginTop: 4 }}>Indique o motivo da sua avaliação.</div>
                )}
              </div>
              <button type="submit" disabled={isLoading} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 38px', fontWeight: 700, fontSize: 19, cursor: 'pointer', opacity: isLoading ? 0.7 : 1 }}>
                {isLoading ? 'Aguarde...' : 'Submeter Feedback'}
              </button>
            </form>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'none' }}>
        <div style={{ display: 'flex', width: '90%', maxWidth: 1400, height: 650, gap: 32, alignItems: 'stretch', justifyContent: 'center' }}>
          <div className="map-section" style={{ flex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="map-header" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', minHeight: 60, boxSizing: 'border-box' }}>
              <div style={{ flex: 1, textAlign: 'left', fontWeight: 800, fontSize: 26, color: '#2563eb' }}>
                Mapa de {selectedCity?.nome || ''}
              </div>
              {trajetoNome && (
                <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: 30, fontWeight: 900, color: '#1e293b', letterSpacing: 1, textShadow: '0 2px 8px #fff' }}>
                    {`${trajetoNome}`}
                  </span>
                </div>
              )}
              <div style={{ flex: 1, textAlign: 'right' }}>
                {route.length > 0 && (
                  <>
                    <button
                      className="open-google-maps-btn"
                      onClick={openInGoogleMaps}
                      title="Abrir no Google Maps"
                    >
                      Abrir no Google Maps
                    </button>
                    <button
                      className="start-route-btn"
                      style={{ marginLeft: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}
                      onClick={handleStartRoute}
                      title="Iniciar Trajeto"
                    >
                      Iniciar Trajeto
                    </button>
                  </>
                )}
              </div>
            </div>
            <MapContainer key={mapResetKey} center={center} zoom={zoom} className="map-container" style={{ flex: 1 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
              {pontosTuristicos.map((ponto, idx) => (
                <Marker key={ponto.id || ponto.nome + '-' + idx} position={ponto.coordenadas} icon={pinIcon}>
                  <Tooltip>{ponto.nome}</Tooltip>
                  <Popup>
                    <div className="popup-content">
                      <h3>{getDisplayName(ponto.nome)}</h3>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                        <StarRating rating={ponto.averageRating} />
                      </div>
                      {ponto.imagem && <img src={ponto.imagem} alt={ponto.nome} className="popup-image" />}
                      <p className="popup-info">{ponto.descricao}</p>
                      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
                        <button
                          className="popup-select-btn"
                          onClick={() => handleCheckboxChange(ponto.nome)}
                          style={{
                            width: '90%',
                            background: selecionados.includes(ponto.nome) ? '#e11d48' : '#22c55e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '10px 0',
                            fontWeight: 700,
                            fontSize: 16,
                            cursor: 'pointer',
                            transition: 'background 0.2s, color 0.2s',
                            margin: '0 auto'
                          }}
                        >
                          {selecionados.includes(ponto.nome) ? 'Remover da Rota' : 'Adicionar à Rota'}
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              {route.length > 0 && <Polyline positions={route} color="blue" />}
            </MapContainer>
          </div>
          <div className="list-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ padding: '18px 0 10px 0', margin: 0, borderRadius: '28px 28px 0 0', background: '#dbeafe', zIndex: 2, color: '#2563eb', fontWeight: 800 }}>
              Pontos de Interesse em {selectedCity.nome}
            </h2>
            <div style={{ flex: 1, minHeight: 0, maxHeight: 'calc(100% - 120px)', overflowY: 'auto' }}>
              {isLoadingPontos ? (
                <div style={{padding: "20px"}}>
                    <Skeleton count={8} height={30} style={{marginBottom: "10px"}}/>
                </div>
              ) : (
                pontosTuristicos.map((ponto) => (
                  <li key={ponto.id} className="ponto-item" onClick={() => handleCheckboxChange(ponto.nome)}>
                    <label htmlFor={`ponto-${ponto.id}`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        id={`ponto-${ponto.id}`}
                        checked={selecionados.includes(ponto.nome)}
                        onChange={() => handleCheckboxChange(ponto.nome)}
                      />
                      {getDisplayName(ponto.nome)}
                    </label>
                  </li>
                ))
              )}
            </div>
            <div className="generate-route-container" style={{ background: '#dbeafe', display: 'flex', justifyContent: 'center', borderRadius: '0 0 28px 28px', paddingBottom: 10, paddingTop: 10, zIndex: 2 }}>
              {rotaCriada ? (
                <button
                  onClick={handleEditarRota}
                  style={{
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 16,
                    fontWeight: 700,
                    fontSize: '1.13em',
                    width: '100%',
                    padding: '16px 0',
                    cursor: 'pointer',
                    boxShadow: 'none',
                    letterSpacing: '0.02em',
                    transition: 'background 0.2s, color 0.2s',
                    marginTop: 0
                  }}
                >
                  Editar Rota
                </button>
              ) : (
                <button
                  onClick={generateRoute}
                  disabled={isLoading || selecionados.length < 2}
                  style={{
                    background: 'transparent',
                    color: '#2563eb',
                    border: 'none',
                    borderRadius: 16,
                    fontWeight: 700,
                    fontSize: '1.13em',
                    width: '100%',
                    padding: '16px 0',
                    cursor: isLoading || selecionados.length < 2 ? 'not-allowed' : 'pointer',
                    boxShadow: 'none',
                    letterSpacing: '0.02em',
                    transition: 'background 0.2s, color 0.2s',
                    marginTop: 0
                  }}
                >
                  Gerar Rota Otimizada
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MapPage;
