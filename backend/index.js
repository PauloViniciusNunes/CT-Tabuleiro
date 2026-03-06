import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const TOKENS_PATH = path.resolve("data/tokens/tokens.json");

// garantir que o arquivo exista
if (!fs.existsSync(TOKENS_PATH)) {
  fs.mkdirSync(path.dirname(TOKENS_PATH), { recursive: true });
  fs.writeFileSync(TOKENS_PATH, "[]");
}

// carregar tokens
app.get("/tokens", (req, res) => {
  const data = fs.readFileSync(TOKENS_PATH, "utf-8");
  res.json(JSON.parse(data));
});

// salvar tokens (sobrescreve)
app.post("/tokens", (req, res) => {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`🧠 Backend rodando em http://localhost:${PORT}`);
});
