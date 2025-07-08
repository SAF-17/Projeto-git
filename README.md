# TouriTrack

TouriTrack é uma aplicação web inovadora para turismo urbano, permitindo aos utilizadores criar, personalizar e partilhar percursos turísticos optimizados de acordo com as suas preferências. O projecto foi desenvolvido com foco na experiência do utilizador, colaboração e gestão eficiente de conteúdos turísticos.

## Funcionalidades Principais
- Geração automática de percursos turísticos personalizados
- Feedback e avaliação de pontos turísticos e trajectos
- Painel de administração para gestão de cidades, pontos turísticos e utilizadores
- Integração com mapas interactivos (Leaflet)
- Autenticação e gestão de utilizadores (Firebase)
- Aprovação de novos pontos turísticos pela administração
- Sistema de comentários e avaliações

## Tecnologias Utilizadas
- React
- Firebase (Auth, Firestore, Hosting)
- Leaflet & React-Leaflet
- OSRM (Open Source Routing Machine)
- CSS moderno

## Instalação e Execução Local
1. Clone o repositório:
   ```bash
   git clone https://github.com/SAF-17/Projeto-git.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm start
   ```
4. Aceda a `http://localhost:3000` no seu navegador.

## Build e Deploy
- Para criar uma build de produção:
  ```bash
  npm run build
  ```
- O deploy pode ser feito facilmente no Firebase Hosting:
  ```bash
  firebase deploy
  ```

## Melhorias Futuras
- Suporte offline (PWA)
- Internacionalização (multi-idioma)
- Integração com plataformas externas de turismo
- Testes automáticos e recolha de métricas
- Fórum de comunidade
- Funcionalidades baseadas em IA (recomendações, assistentes virtuais)

## Licença
Projecto académico desenvolvido no âmbito do curso de Engenharia Informática da UBI.
