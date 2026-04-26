// server.js — servidor local sem precisar do Vercel CLI
require('dotenv').config()
const express = require('express')
const path    = require('path')

const app = express()

app.use(express.json())

// Serve os arquivos HTML estáticos da pasta public/
app.use(express.static(path.join(__dirname, 'public')))

// ── Registra todas as rotas da API ─────────────────────
const routes = [
  { method: 'post',   path: '/api/auth/register',        handler: './api/auth/register'        },
  { method: 'post',   path: '/api/auth/login',           handler: './api/auth/login'            },
  { method: 'get',    path: '/api/wix/connect',          handler: './api/wix/connect'           },
  { method: 'get',    path: '/api/wix/callback',         handler: './api/wix/callback'          },
  { method: 'get',    path: '/api/wix/data',             handler: './api/wix/data'              },
  { method: 'delete', path: '/api/wix/disconnect',       handler: './api/wix/disconnect'        },
  { method: 'post',   path: '/api/sync/run',             handler: './api/sync/run'              },
  { method: 'put',    path: '/api/staff/commission',     handler: './api/staff/commission'      },
]

// CORS para todas as rotas /api
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

for (const route of routes) {
  app[route.method](route.path, (req, res) => {
    try {
      require(route.handler)(req, res)
    } catch (e) {
      console.error(`Erro em ${route.path}:`, e.message)
      res.status(500).json({ error: e.message })
    }
  })
}

// Qualquer rota não encontrada → retorna o dashboard (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('')
  console.log('  ✅ WixDash rodando em http://localhost:' + PORT)
  console.log('')
  console.log('  Login demo:')
  console.log('    Email: demo@wixdash.com')
  console.log('    Senha: demo1234')
  console.log('')
})
