require('dotenv').config();
const express = require('express');
const path = require('path');
const { connectToWhatsApp } = require('./whatsapp/connection');
const { initScheduler } = require('./scheduler/cron');
const { requireAuth } = require('./middleware/auth');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend estático
app.use(express.static(path.join(__dirname, 'public')));

// Endpoints REST de la API protegidos con token
app.use('/api', requireAuth, messageRoutes);

// Iniciar servidor HTTP
const server = app.listen(PORT, () => {
  console.log(`🌐 Servidor web iniciado en http://localhost:${PORT}`);
});

// Iniciar Baileys y el cron scheduler
console.log('🚀 Iniciando WhatsApp Scheduler...');
connectToWhatsApp()
  .then(() => {
    initScheduler();
  })
  .catch((err) => {
    console.error('❌ Error fatal al conectar Baileys:', err);
  });

// Manejo de apagado graceful
function gracefulShutdown() {
  console.log('\n🛑 Cerrando servicios de WhatsApp Scheduler...');
  server.close(() => {
    console.log('Servidor HTTP cerrado.');
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = { app, server };
