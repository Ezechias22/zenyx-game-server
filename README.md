# zenyx-game-server (Next.js)

UI de jeu à afficher dans un **iframe**.

✅ Le navigateur ne voit jamais tes secrets:
- Le navigateur appelle `/api/*`
- Les routes Next.js (server) appellent ton provider `/v1/public/*` avec `x-public-token` + `x-operator-key`

## Setup local
```bash
npm install
copy .env.example .env
npm run dev
```

## Variables d'env (Railway)
- `PROVIDER_BASE_URL`
- `PUBLIC_TOKEN`
- `OPERATOR_KEY`

## URLs
- `/` : page test (liste jeux + create session)
- `/play?sessionId=sess_...` : UI du jeu (à ouvrir dans iframe)
