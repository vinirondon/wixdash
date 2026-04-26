# WixDash — Setup Completo

## Pré-requisitos
- Node.js 18+
- SQL Server (local) — Express Edition é gratuito
- Conta no Wix com app criado em dev.wix.com

---

## 1. Instalar dependências

```bash
npm install
```

---

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env`:

```env
# String de conexão SQL Server
# Formato: sqlserver://HOST:PORTA;database=NOME_DB;user=USUARIO;password=SENHA;trustServerCertificate=true
DATABASE_URL="sqlserver://localhost:1433;database=WixDash;user=sa;password=SuaSenha123!;trustServerCertificate=true"

# Gere um secret seguro:
# node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=coloque_aqui_string_aleatoria_longa

# Do painel em dev.wix.com → seu app → OAuth
WIX_CLIENT_ID=seu_client_id
WIX_CLIENT_SECRET=seu_client_secret
WIX_REDIRECT_URI=http://localhost:3000/api/wix/callback

FRONTEND_URL=http://localhost:3000
```

---

## 3. Criar o banco no SQL Server

No SQL Server Management Studio (SSMS) ou via sqlcmd:

```sql
CREATE DATABASE WixDash;
```

---

## 4. Criar as tabelas + dados demo

```bash
# Cria as tabelas
npm run db:push

# Popula com dados de demonstração
npm run db:seed
```

Depois do seed você já pode logar com:
- **Email:** `demo@wixdash.com`
- **Senha:** `demo1234`

---

## 5. Rodar localmente

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 6. Configurar o app Wix (para conexão real)

1. Acesse https://dev.wix.com
2. Abra seu app → **OAuth** → copie **Client ID** e **Client Secret**
3. Em **Redirect URIs**, adicione: `http://localhost:3000/api/wix/callback`
4. Cole Client ID e Secret no `.env`
5. No app, habilite as permissões:
   - `WIX_BOOKINGS.READ_BOOKINGS`
   - `WIX_BOOKINGS.READ_SERVICES`
   - `WIX_BOOKINGS.READ_STAFF`
   - `WIX_CRM.READ_CONTACTS`
   - `WIX_ECOMMERCE.READ_ORDERS`
   - `SITE_PROPERTIES.READ`

---

## Estrutura do projeto

```
wixdash/
├── api/
│   ├── auth/
│   │   ├── login.js        ← POST /api/auth/login
│   │   └── register.js     ← POST /api/auth/register
│   ├── wix/
│   │   ├── connect.js      ← GET  /api/wix/connect    (gera URL OAuth)
│   │   ├── callback.js     ← GET  /api/wix/callback   (recebe token do Wix)
│   │   ├── data.js         ← GET  /api/wix/data       (retorna dados do banco)
│   │   └── disconnect.js   ← DELETE /api/wix/disconnect
│   ├── sync/
│   │   └── run.js          ← POST /api/sync/run       (ingere dados do Wix)
│   └── staff/
│       └── commission.js   ← PUT  /api/staff/commission
├── lib/
│   ├── prisma.js           ← cliente do banco (singleton)
│   ├── jwt.js              ← assinar/verificar tokens JWT
│   └── wix.js              ← cliente da API Wix (com refresh automático)
├── middleware/
│   └── auth.js             ← proteção de rotas + CORS
├── prisma/
│   ├── schema.prisma       ← modelos SQL Server
│   └── seed.js             ← dados demo
├── public/
│   ├── index.html          ← landing page
│   └── dashboard.html      ← app do cliente
├── .env.example
├── vercel.json
└── package.json
```

---

## Deploy (quando estiver pronto)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variáveis no painel Vercel:
# vercel env add DATABASE_URL
# vercel env add JWT_SECRET
# vercel env add WIX_CLIENT_ID
# vercel env add WIX_CLIENT_SECRET
# vercel env add WIX_REDIRECT_URI   ← https://seudominio.vercel.app/api/wix/callback
# vercel env add FRONTEND_URL       ← https://seudominio.vercel.app
```

> **Importante para deploy:** SQL Server local não é acessível da Vercel.
> Para produção use Azure SQL (compatível com a mesma string de conexão) ou migre para PostgreSQL.

---

## Fluxo OAuth completo

```
Cliente clica "Connect Wix"
       ↓
GET /api/wix/connect  →  retorna authUrl do Wix
       ↓
Browser redireciona para Wix
       ↓
Usuário autoriza o app
       ↓
Wix redireciona para /api/wix/callback?code=xxx&state=yyy
       ↓
Backend troca code por access_token + refresh_token
       ↓
Tokens salvos no banco (WixConnection)
       ↓
Redireciona para /dashboard?wix_connected=1
       ↓
Dashboard chama POST /api/sync/run
       ↓
Backend busca bookings, clients, services, orders, staff da API Wix
       ↓
Dados salvos no banco com upsert (idempotente)
       ↓
Dashboard exibe os dados via GET /api/wix/data
```
