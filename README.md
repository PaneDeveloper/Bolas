# Bolinhas distribuído

Versão baseada no `bolas.html` enviado. A animação continua no navegador; a extração dos pixels é processada pelo servidor Node.js.

## Arquitetura
- Navegador: desenha texto/imagem no canvas e envia o buffer RGBA ao servidor.
- Servidor: divide a imagem em faixas e coordena o processamento.
- `worker_threads`: processamento paralelo na máquina hospedeira.
- Workers remotos opcionais: navegadores em `/worker.html` recebem faixas via WebSocket.
- Renderização por frame continua local. Não transmitimos posições de partículas em tempo real.

## Executar
Requer Node.js 20+.
```bash
npm install
npm start
```
Abra http://localhost:3000.

## Workers remotos
Configure um token no servidor:
```bash
WORKER_TOKEN="token-longo" npm start
```
Em máquinas autorizadas, abra http://IP-DO-SERVIDOR:3000/worker.html, informe o token e conecte. Para HTTPS, o proxy precisa encaminhar WebSocket em `/compute`. Não exponha workers sem token em redes públicas: os pixels enviados serão compartilhados com workers conectados.

## Variáveis
- `PORT`: porta HTTP (3000)
- `WORKER_THREADS`: threads locais (padrão: núcleos disponíveis - 1, máximo 16)
- `WORKER_TOKEN`: token para workers remotos
- `MAX_IMAGE_BYTES`: limite do payload (24 MiB)

## API
- `GET /api/status`
- `POST /api/points?width=...&height=...&step=2` com RGBA binário

Se o servidor não responder, a página faz fallback para processamento local.
