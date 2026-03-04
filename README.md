# 🌐 Bolinhas Stats Lobby

Um lobby multiplayer onde texto vira arte feita de partículas em tempo real.

> Digita.  
> As bolinhas se organizam.  
> A galera pode assistir.

---

## 🚀 Sobre o Projeto

O **Bolinhas Stats Lobby** é um experimento visual multiplayer baseado em P2P (Peer-to-Peer).

Cada jogador possui um canvas privado onde pode escrever algo.  
Milhares de partículas se organizam para formar o texto digitado.

Outros jogadores na mesma sala podem:
- Ver seu nome na lista
- Clicar no seu perfil
- Assistir sua criação em tempo real

Sem servidor salvando dados.  
Sem banco de dados.  
Só navegador conversando com navegador.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 Canvas** — Renderização de até 3.000 partículas
- **PeerJS (WebRTC)** — Conexão direta entre navegadores
- **Vanilla JavaScript** — Motor de física e lógica multiplayer

---

## 🎮 Como Usar

### 1️⃣ Entrar na Sala
- Escolha um Nick
- Defina um ID de Sala (ou gere um aleatório)

### 2️⃣ Convidar Amigos
- Envie o ID da Sala
- Eles precisam usar o mesmo ID para entrar

### 3️⃣ Interagir
- Digite no campo central para mover as bolinhas
- Use o Chat Global
- Clique nos nomes em **Players Online** para abrir o canvas deles

---

## 📡 Arquitetura de Rede

Como o projeto é hospedado no GitHub Pages (ambiente estático), ele utiliza:

- 🔗 Arquitetura Mesh (P2P)
- 🔒 Sem armazenamento de dados
- ♻️ Sessão reinicia ao recarregar a página

O que você escreve é privado até alguém abrir seu perfil.

---

## 🧪 Curiosidade Técnica

O sistema de partículas usa:

- Vetores
- Aceleração
- Distância euclidiana
- Interpolação suave

Tudo calculado em tempo real para que as bolinhas:

- Não colidam
- Se organizem corretamente
- Formem o texto de maneira fluida

Mas você só precisa digitar e curtir o efeito 😉

---

## 💡 Objetivo do Projeto

Explorar:

- WebRTC na prática
- Renderização otimizada em Canvas
- Multiplayer sem backend
- Experimentos visuais interativos

---

⭐ Projeto criado para experimentação e diversão.
