// Não utilizado no fluxo de API Key
module.exports = function handler(req, res) {
  res.redirect((process.env.FRONTEND_URL || '') + '/dashboard.html')
}
