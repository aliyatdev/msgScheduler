function requireAuth(req, res, next) {
  const configuredToken = process.env.AUTH_TOKEN;

  if (!configuredToken) {
    console.warn('⚠️ AUTH_TOKEN no configurado en .env. Denegando acceso por seguridad.');
    return res.status(500).json({
      success: false,
      error: 'El servidor no tiene configurado AUTH_TOKEN en el entorno.'
    });
  }

  // Verificar encabezado x-api-token, Bearer token o query param
  const headerToken = req.headers['x-api-token'];
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const queryToken = req.query.token;

  const providedToken = headerToken || bearerToken || queryToken;

  if (!providedToken || providedToken !== configuredToken) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado. Token de acceso inválido o ausente.'
    });
  }

  next();
}

module.exports = {
  requireAuth
};
