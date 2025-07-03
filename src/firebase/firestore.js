import { db, storage } from './config';
import { collection, setDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc, runTransaction, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { distritosCidades } from './dadosGeograficos';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Função para verificar se uma cidade já existe
export const cidadeExists = async (nomeCidade) => {
  try {
    const cidadeRef = doc(db, 'Cidades', nomeCidade);
    const docSnap = await getDoc(cidadeRef);
    return docSnap.exists();
  } catch (error) {
    console.error("Erro ao verificar a cidade:", error);
    throw error;
  }
};

// Função para criar uma nova cidade
export const criarCidade = async (novaCidade) => {
  try {
    const cidadeRef = doc(db, "Cidades", novaCidade.nome);
    await setDoc(cidadeRef, {
      nome: novaCidade.nome,
      coordenadas_centro: novaCidade.coordenadas_centro,
      zoom: novaCidade.zoom,
      imageUrl: novaCidade.imageUrl,
      distrito: novaCidade.distrito,
    });
    return { id: novaCidade.nome, ...novaCidade, distrito: novaCidade.distrito };
  } catch (error) {
    console.error("Erro ao criar cidade: ", error);
    throw error;
  }
};

// Função para adicionar um novo ponto turístico
export const adicionarPontoTuristico = async (ponto, distrito, cidade) => {
  try {
    const pontoRef = doc(db, 'Cidades', cidade, 'PontosTuristicos', ponto.nome_ponto);
    await setDoc(pontoRef, {
      ...ponto,
      estado: 'pendente',
      // Inicializar campos de classificação para o ponto
      totalRating: 0,
      ratingCount: 0,
      averageRating: 0,
    });
    return { id: ponto.nome_ponto, ...ponto, estado: 'pendente' };
  } catch (error) {
    console.error("Erro ao adicionar ponto turístico:", error);
    throw error;
  }
};

// Função para obter todas as cidades disponíveis
export const obterCidades = async () => {
  try {
    const cidadesRef = collection(db, 'Cidades');
    const querySnapshot = await getDocs(cidadesRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao obter cidades:", error);
    throw error;
  }
};

// Função para obter todos os pontos turísticos de uma cidade
export const obterPontosTuristicos = async (cidade) => {
  try {
    const pontosRef = collection(db, 'Cidades', cidade, 'PontosTuristicos');
    const querySnapshot = await getDocs(pontosRef);
    const pontos = querySnapshot.docs.map(doc => {
      const dados = doc.data();
      
      // Lógica para converter coordenadas, se necessário
      let coords = [0, 0];
      if (dados.coordenadas_ponto && typeof dados.coordenadas_ponto.latitude === 'number') {
        coords = [dados.coordenadas_ponto.latitude, dados.coordenadas_ponto.longitude];
      } else if (Array.isArray(dados.coordenadas_ponto)) {
        coords = dados.coordenadas_ponto;
      }

      // Mapeamento correto dos campos, garantindo que todos os dados são incluídos
      return {
        ...dados, // Copia todos os campos da base de dados (incluindo averageRating)
        id: doc.id,
        nome: dados.nome_ponto, // Garante que o campo 'nome' esperado pela app existe
        coordenadas: coords,
        descricao: dados.info_ponto,
        imagem: dados.img_link_ponto,
      };
    });
    return pontos;
  } catch (error) {
    console.error("Erro ao obter pontos turísticos:", error);
    throw error;
  }
};

// Função para atualizar um ponto turístico
export const atualizarPontoTuristico = async (cidade, id, dados) => {
  try {
    const docRef = doc(db, 'Cidades', cidade, 'PontosTuristicos', id);
    await updateDoc(docRef, dados);
    return { id, ...dados };
  } catch (error) {
    console.error("Erro ao atualizar ponto turístico:", error);
    throw error;
  }
};

// Função para deletar um ponto turístico
export const deletarPontoTuristico = async (cidade, id) => {
  try {
    const docRef = doc(db, 'Cidades', cidade, 'PontosTuristicos', id);
    await deleteDoc(docRef);
    return id;
  } catch (error) {
    console.error("Erro ao deletar ponto turístico:", error);
    throw error;
  }
};

export const guardarTrajeto = async ({ nome, pontos, utilizador, cidade }) => {
  try {
    await setDoc(doc(db, 'Trajetos', nome), {
      nome,
      pontos,
      utilizador,
      cidade,
      data: new Date().toISOString(),
      // Inicializar campos para a classificação
      totalRating: 0,
      ratingCount: 0,
      averageRating: 0,
    });
    return nome;
  } catch (error) {
    console.error('Erro ao guardar trajeto:', error);
    throw error;
  }
};

export const buscarTrajetos = async (utilizador) => {
  try {
    const q = query(
      collection(db, 'Trajetos'),
      where('utilizador', '==', utilizador),
      orderBy('data', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Erro ao buscar trajetos:', error);
    throw error;
  }
};

export const buscarTodosTrajetos = async () => {
  try {
    const trajetosRef = collection(db, 'Trajetos');
    const q = query(trajetosRef, orderBy('data', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Erro ao buscar todos os trajetos:', error);
    throw error;
  }
};

export const buscarTrajetosPorCidade = async (cidade) => {
  try {
    const q = query(
      collection(db, 'Trajetos'),
      where('cidade', '==', cidade),
      orderBy('data', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Erro ao buscar trajetos por cidade:', error);
    throw error;
  }
};

// Função de migração para adicionar o campo 'distrito' às cidades existentes
export const atualizarDistritosDasCidades = async () => {
  console.log("A iniciar a atualização de distritos para as cidades existentes...");

  // 1. Criar um mapa reverso de cidade para distrito para consulta rápida
  const cidadeParaDistrito = {};
  for (const distrito in distritosCidades) {
    for (const cidade of distritosCidades[distrito]) {
      cidadeParaDistrito[cidade] = distrito;
    }
  }
  console.log("Mapa de Cidades -> Distritos criado.");

  // 2. Obter todas as cidades da base de dados
  const cidadesDaDB = await obterCidades();
  console.log(`Encontradas ${cidadesDaDB.length} cidades na base de dados para verificar.`);

  // 3. Iterar sobre cada cidade e atualizar o documento se necessário
  const promises = cidadesDaDB.map(async (cidade) => {
    const nomeCidade = cidade.id;
    const distritoCorreto = cidadeParaDistrito[nomeCidade];

    if (distritoCorreto) {
      // Só atualiza se o campo 'distrito' não existir ou for diferente
      if (cidade.distrito !== distritoCorreto) {
        try {
          const cidadeRef = doc(db, 'Cidades', nomeCidade);
          await updateDoc(cidadeRef, { distrito: distritoCorreto });
        } catch (error) {
          console.error(`Erro ao atualizar o distrito para a cidade "${nomeCidade}":`, error);
        }
      }
    } else {
      console.warn(`AVISO: A cidade "${nomeCidade}" existe na BD mas não foi encontrada na lista de dados geográficos.`);
    }
  });

  await Promise.all(promises);
  console.log("Atualização de distritos concluída.");
};

// Função para atualizar a imagem de uma cidade
export const atualizarImagemCidade = async (nomeCidade, imageUrl) => {
  try {
    const cidadeRef = doc(db, 'Cidades', nomeCidade);
    await updateDoc(cidadeRef, { imageUrl });
  } catch (error) {
    console.error(`Erro ao atualizar a imagem da cidade "${nomeCidade}":`, error);
    throw error;
  }
};

// Função para atribuir o papel de admin a um utilizador pelo e-mail
export const atribuirRoleAdminPorEmail = async (email) => {
  try {
    const auth = getAuth();
    // Procurar o utilizador pelo e-mail
    const user = auth.currentUser;
    if (!user || user.email !== email) {
      throw new Error('O utilizador autenticado não corresponde ao e-mail fornecido. Por favor, autentique-se com o e-mail desejado.');
    }
    const uid = user.uid;
    const userRef = doc(db, 'Utilizadores', uid);
    await setDoc(userRef, { role: 'admin', email }, { merge: true });
  } catch (error) {
    console.error('Erro ao atribuir role admin:', error);
    throw error;
  }
};

// Função para atribuir o papel de admin a um utilizador pelo UID
export const atribuirRoleAdminPorUid = async (uid, email) => {
  try {
    const userRef = doc(db, 'Utilizadores', uid);
    await setDoc(userRef, { role: 'admin', email }, { merge: true });
  } catch (error) {
    console.error('Erro ao atribuir role admin por UID:', error);
    throw error;
  }
};

// Função para atualizar todos os campos de uma cidade
export const atualizarCidade = async (nomeCidade, dados) => {
  try {
    const cidadeRef = doc(db, 'Cidades', nomeCidade);
    await updateDoc(cidadeRef, dados);
  } catch (error) {
    console.error(`Erro ao atualizar a cidade "${nomeCidade}":`, error);
    throw error;
  }
};

// Função para deletar um trajeto pelo nome (ID)
export const deletarTrajeto = async (nome) => {
  try {
    await deleteDoc(doc(db, 'Trajetos', nome));
    return nome;
  } catch (error) {
    console.error('Erro ao deletar trajeto:', error);
    throw error;
  }
};

// Função para obter o texto do Sobre
export const obterTextoSobre = async () => {
  try {
    const docRef = doc(db, 'Sobre', 'Texto');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().texto_sobre || '';
    } else {
      return '';
    }
  } catch (error) {
    console.error('Erro ao obter texto do Sobre:', error);
    throw error;
  }
};

// Função para atualizar o texto do Sobre
export const atualizarTextoSobre = async (novoTexto) => {
  try {
    const docRef = doc(db, 'Sobre', 'Texto');
    await setDoc(docRef, { texto_sobre: novoTexto }, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar texto do Sobre:', error);
    throw error;
  }
};

// Função para fazer upload de uma foto de feedback
export const uploadFeedbackPhoto = async (photoFile) => {
  if (!photoFile) return null;
  const timestamp = new Date().getTime();
  const fileName = `${timestamp}-${photoFile.name}`;
  const storageRef = ref(storage, `feedback_photos/${fileName}`);
  
  try {
    const uploadResult = await uploadBytes(storageRef, photoFile);
    const downloadURL = await getDownloadURL(uploadResult.ref);
    return downloadURL;
  } catch (error) {
    console.error("Erro ao fazer upload da foto de feedback:", error);
    throw error;
  }
};

// Função para guardar o feedback completo
export const saveFeedback = async (feedbackData) => {
  try {
    const feedbackCollectionRef = collection(db, 'Feedback');
    const newFeedbackDocRef = doc(feedbackCollectionRef); // Cria um novo documento com ID automático
    
    await setDoc(newFeedbackDocRef, {
      ...feedbackData,
      timestamp: new Date()
    });
    
    return newFeedbackDocRef.id;
  } catch (error) {
    console.error("Erro ao guardar o feedback:", error);
    throw error;
  }
};

// Nova função para atualizar a classificação de um trajeto
export const updateTrajetoRating = async (trajetoNome, newRating) => {
  if (!trajetoNome || typeof newRating !== 'number' || newRating < 1 || newRating > 5) {
    console.error("Input inválido para atualizar a classificação.");
    return;
  }

  const trajetoRef = doc(db, 'Trajetos', trajetoNome);

  try {
    await runTransaction(db, async (transaction) => {
      const trajetoDoc = await transaction.get(trajetoRef);
      if (!trajetoDoc.exists()) {
        throw new Error("Trajeto não encontrado!");
      }

      const dadosAtuais = trajetoDoc.data();
      const newTotalRating = (dadosAtuais.totalRating || 0) + newRating;
      const newRatingCount = (dadosAtuais.ratingCount || 0) + 1;
      const newAverageRating = newTotalRating / newRatingCount;

      transaction.update(trajetoRef, {
        totalRating: newTotalRating,
        ratingCount: newRatingCount,
        averageRating: parseFloat(newAverageRating.toFixed(2)),
      });
    });
  } catch (error) {
    console.error("Falha na transação ao atualizar a classificação: ", error);
    throw error;
  }
};

// Nova função para atualizar a classificação de um Ponto Turístico
export const updatePontoTuristicoRating = async (cidadeId, pontoId, newRating) => {
  if (!cidadeId || !pontoId || typeof newRating !== 'number') {
    console.error("Input inválido para atualizar a classificação do ponto.");
    return;
  }

  const pontoRef = doc(db, 'Cidades', cidadeId, 'PontosTuristicos', pontoId);

  try {
    await runTransaction(db, async (transaction) => {
      const pontoDoc = await transaction.get(pontoRef);
      if (!pontoDoc.exists()) {
        throw new Error("Ponto turístico não encontrado!");
      }

      const dadosAtuais = pontoDoc.data();
      const newTotalRating = (dadosAtuais.totalRating || 0) + newRating;
      const newRatingCount = (dadosAtuais.ratingCount || 0) + 1;
      const newAverageRating = newTotalRating / newRatingCount;

      transaction.update(pontoRef, {
        totalRating: newTotalRating,
        ratingCount: newRatingCount,
        averageRating: parseFloat(newAverageRating.toFixed(2)),
      });
    });
  } catch (error) {
    console.error(`Falha na transação ao atualizar a classificação do ponto ${pontoId}: `, error);
    throw error;
  }
};

// Função genérica para upload de imagem
export const uploadImage = async (file, path) => {
  if (!file) return null;
  const storage = getStorage();
  const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
  try {
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);
    return downloadURL;
  } catch (error) {
    console.error(`Erro ao fazer upload da imagem para ${path}:`, error);
    throw error;
  }
};

export const listenPontosTuristicos = (cidade, callback) => {
  const pontosRef = collection(db, 'Cidades', cidade, 'PontosTuristicos');
  return onSnapshot(pontosRef, (snapshot) => {
    const pontos = snapshot.docs.map(doc => {
      const dados = doc.data();
      let coords = [0, 0];
      if (dados.coordenadas_ponto && typeof dados.coordenadas_ponto.latitude === 'number') {
        coords = [dados.coordenadas_ponto.latitude, dados.coordenadas_ponto.longitude];
      } else if (Array.isArray(dados.coordenadas_ponto)) {
        coords = dados.coordenadas_ponto;
      }
      return {
        ...dados,
        id: doc.id,
        nome: dados.nome_ponto,
        coordenadas: coords,
        descricao: dados.info_ponto,
        imagem: dados.img_link_ponto,
      };
    });
    callback(pontos);
  });
};

export const deletarCidade = async (nomeCidade) => {
  try {
    const cidadeRef = doc(db, 'Cidades', nomeCidade);
    await deleteDoc(cidadeRef);
    return nomeCidade;
  } catch (error) {
    console.error('Erro ao apagar cidade:', error);
    throw error;
  }
};

// Função para ouvir alterações em tempo real ao texto do Sobre
export const listenTextoSobre = (callback) => {
  const docRef = doc(db, 'Sobre', 'Texto');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().texto_sobre || '');
    } else {
      callback('');
    }
  });
}; 