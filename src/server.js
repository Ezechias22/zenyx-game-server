import express from "express";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 8080);
const PROVIDER = (process.env.PROVIDER_BASE_URL || "").replace(/\/+$/, "");

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/play/:gameCode", (req, res) => {
  const { gameCode } = req.params;
  const token = String(req.query.t || "");
  if (!token) return res.status(400).send("Missing token");
  if (!PROVIDER) return res.status(500).send("Missing PROVIDER_BASE_URL");

  res.type("html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>ZENYX - ${gameCode}</title>
  <style>
    body{margin:0;font-family:Arial;background:#0b0f19;color:#fff}
    .wrap{max-width:900px;margin:0 auto;padding:16px}
    .card{background:#121a2a;border-radius:12px;padding:16px}
    button{padding:12px 18px;border-radius:10px;border:0;background:#2b79ff;color:#fff;font-weight:bold;cursor:pointer}
    input{padding:10px;border-radius:8px;border:0}
    pre{background:#0e1524;padding:12px;border-radius:8px}
  </style>
</head>
<body>
  <div class="wrap">
    <h2>🎰 ${gameCode}</h2>

    <div class="card">
      <input id="bet" value="1"/>
      <button onclick="spin()">SPIN</button>

      <h3>Session</h3>
      <pre id="session">Loading...</pre>

      <h3>Result</h3>
      <pre id="result">-</pre>
    </div>
  </div>

<script>
  const PROVIDER = "${PROVIDER}";
  const token = "${token}";

  async function post(url, body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const t = await r.text();
    return JSON.parse(t);
  }

  async function loadSession() {
    const s = await post(PROVIDER + "/v1/public/game/session", { token });
    document.getElementById("session").textContent = JSON.stringify(s, null, 2);
  }

  async function spin() {
    const bet = Number(document.getElementById("bet").value);
    const r = await post(PROVIDER + "/v1/public/game/play", { token, bet });
    document.getElementById("result").textContent = JSON.stringify(r, null, 2);
  }

  loadSession();
</script>
</body>
</html>`);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Game server running on port", PORT);
});
