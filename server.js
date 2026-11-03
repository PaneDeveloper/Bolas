import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { Worker } from "node:worker_threads";
import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 3000);
const token = process.env.WORKER_TOKEN || "";
const threads = Math.max(1, Math.min(Number(process.env.WORKER_THREADS || Math.max(1, (os.availableParallelism?.() || 2) - 1)), 16));
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

class Pool {
  constructor(size) {
    this.slots = Array.from({ length: size }, () => ({ worker: new Worker(join(root, "processor.js")), busy: false, task: null }));
    this.queue = [];
    for (const slot of this.slots) {
      slot.worker.on("message", msg => {
        const task = slot.task; slot.task = null; slot.busy = false;
        if (task) msg.error ? task.reject(new Error(msg.error)) : task.resolve(msg.points);
        this.pump();
      });
      slot.worker.on("error", err => {
        const task = slot.task; slot.task = null; slot.busy = false;
        if (task) task.reject(err);
        this.pump();
      });
    }
  }
  run(buffer, width, height, step, yStart, yEnd) {
    return new Promise((resolve, reject) => { this.queue.push({ buffer, width, height, step, yStart, yEnd, resolve, reject }); this.pump(); });
  }
  pump() {
    for (const slot of this.slots) {
      if (slot.busy || !this.queue.length) continue;
      const task = this.queue.shift();
      const copy = Uint8Array.from(task.buffer).buffer;
      slot.busy = true; slot.task = task;
      slot.worker.postMessage({ buffer: copy, width: task.width, height: task.height, step: task.step, yStart: task.yStart, yEnd: task.yEnd }, [copy]);
    }
  }
  close() { for (const slot of this.slots) slot.worker.terminate(); }
}

const pool = new Pool(threads);
const remoteWorkers = new Set();
let remoteId = 0;
const reply = (res, status, value) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(value)); };

async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 24 * 1024 * 1024) throw Object.assign(new Error("Payload excede 24 MiB"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function remoteTask(worker, payload) {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const timer = setTimeout(() => { worker.pending.delete(id); reject(new Error("Worker remoto expirou")); }, 8000);
    worker.pending.set(id, { resolve, reject, timer });
    worker.ws.send(JSON.stringify({ type: "task", id, ...payload }));
  });
}
async function processChunk(buffer, width, height, step, yStart, yEnd) {
  const worker = [...remoteWorkers].find(item => item.ws.readyState === 1 && !item.busy);
  if (worker) {
    worker.busy = true;
    try { return await remoteTask(worker, { width, height, step, yStart, yEnd, data: Buffer.from(buffer).toString("base64") }); }
    catch { /* fallback local */ }
    finally { worker.busy = false; }
  }
  return pool.run(buffer, width, height, step, yStart, yEnd);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/api/status") return reply(res, 200, { ok: true, threads, remoteWorkers: remoteWorkers.size });
  if (req.method === "POST" && url.pathname === "/api/points") {
    try {
      const width = Number(url.searchParams.get("width")), height = Number(url.searchParams.get("height")), step = Number(url.searchParams.get("step") || 2);
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 16000000 || step < 1 || step > 16) return reply(res, 400, { error: "Dimensões inválidas" });
      const data = await readBody(req);
      if (data.length !== width * height * 4) return reply(res, 400, { error: "Buffer RGBA inválido" });
      const rows = Math.max(32, Math.ceil(height / threads)), jobs = [];
      for (let y = 0; y < height; y += rows) jobs.push(processChunk(data, width, height, step, y, Math.min(height, y + rows)));
      const points = (await Promise.all(jobs)).flat().sort((a, b) => a.y - b.y || a.x - b.x);
      return reply(res, 200, { points, workers: remoteWorkers.size || threads });
    } catch (err) { return reply(res, err.status || 500, { error: err.message }); }
  }
  if (req.method !== "GET" && req.method !== "HEAD") return reply(res, 405, { error: "Método não permitido" });
  let pathname = decodeURIComponent(url.pathname); if (pathname === "/") pathname = "/index.html";
  const file = join(publicDir, pathname.replace(/^\/+/, ""));
  if (!file.startsWith(publicDir)) return reply(res, 403, { error: "Acesso negado" });
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch { reply(res, 404, { error: "Arquivo não encontrado" }); }
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 48 * 1024 * 1024 });
server.on("upgrade", (req, socket, head) => {
  if (new URL(req.url, "http://localhost").pathname !== "/compute") return socket.destroy();
  wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
});
wss.on("connection", ws => {
  const worker = { id: ++remoteId, ws, busy: false, pending: new Map(), authenticated: false };
  ws.on("message", raw => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!worker.authenticated) {
      if (msg.type !== "hello" || (token && msg.token !== token)) return ws.close(1008, "Token inválido");
      worker.authenticated = true; remoteWorkers.add(worker);
      ws.send(JSON.stringify({ type: "welcome", id: worker.id })); return;
    }
    if (msg.type === "result" && typeof msg.id === "string") {
      const task = worker.pending.get(msg.id); if (!task) return;
      clearTimeout(task.timer); worker.pending.delete(msg.id);
      Array.isArray(msg.points) ? task.resolve(msg.points) : task.reject(new Error("Resultado inválido"));
    }
  });
  ws.on("close", () => {
    remoteWorkers.delete(worker);
    for (const task of worker.pending.values()) { clearTimeout(task.timer); task.reject(new Error("Worker desconectado")); }
  });
});
server.listen(port, "0.0.0.0", () => console.log("Bolinhas em http://localhost:" + port + " | threads: " + threads));
process.on("SIGINT", () => { pool.close(); server.close(() => process.exit(0)); });
