const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

let sock = null;
let isSocketConnected = false;

const sessionPath = process.env.SESSION_PATH || path.resolve(__dirname, '../../auth_session');
const qrImagePath = path.resolve(__dirname, '../../qr.png');

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined, isLatest: false }));

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['WhatsApp Scheduler', 'Chrome', '1.0.0'],
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n=============================================');
      console.log('📲 Escanea este código QR con WhatsApp para vincular:');
      qrcodeTerminal.generate(qr, { small: true });
      console.log('=============================================\n');

      // Generar imagen qr.png para facilitar escaneo
      QRCode.toFile(qrImagePath, qr, { width: 350 }).catch((err) => {
        console.error('No se pudo generar qr.png:', err.message);
      });
      console.log(`ℹ️ También puedes ver la imagen del QR en: ${qrImagePath}`);
    }

    if (connection === 'close') {
      isSocketConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ Conexión cerrada. Razón (código): ${statusCode || 'desconocida'}`);

      if (shouldReconnect) {
        console.log('🔄 Reconectando en 5 segundos...');
        setTimeout(() => {
          connectToWhatsApp();
        }, 5000);
      } else {
        console.log('❌ Sesión cerrada por WhatsApp (Logged Out). Se requiere borrar auth_session/ y escanear QR nuevamente.');
      }
    } else if (connection === 'open') {
      isSocketConnected = true;
      console.log('✅ Conexión con WhatsApp establecida exitosamente.');
      if (fs.existsSync(qrImagePath)) {
        fs.unlinkSync(qrImagePath);
      }
    }
  });

  return sock;
}

function getSocket() {
  return sock;
}

function isConnected() {
  return isSocketConnected;
}

module.exports = {
  connectToWhatsApp,
  getSocket,
  isConnected
};
