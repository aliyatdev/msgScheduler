const cron = require('node-cron');
const { getDueMessages, updateMessageStatus } = require('../db/db');
const { sendWhatsAppMessage } = require('../whatsapp/sendMessage');
const { isConnected } = require('../whatsapp/connection');

let isCronRunning = false;

// Retardo en milisegundos con promesa
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Genera un retardo aleatorio entre min y max segundos para espaciar envíos
function getRandomDelay(minSeconds = 3, maxSeconds = 8) {
  const min = minSeconds * 1000;
  const max = maxSeconds * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Procesa todos los mensajes pendientes cuya fecha/hora programada ya se cumplió.
 */
async function processDueMessages() {
  if (isCronRunning) {
    console.log('⏳ Scheduler: Ejecución previa aún en curso. Omitiendo este ciclo.');
    return;
  }

  isCronRunning = true;

  try {
    const dueMessages = getDueMessages();

    if (dueMessages.length === 0) {
      return;
    }

    console.log(`⏰ Scheduler: Se encontraron ${dueMessages.length} mensaje(s) listo(s) para enviar.`);

    if (!isConnected()) {
      console.warn('⚠️ Scheduler: WhatsApp no está conectado actualmente. Los mensajes se reintentarán en el próximo ciclo.');
      return;
    }

    for (let i = 0; i < dueMessages.length; i++) {
      const msg = dueMessages[i];

      // Si no es el primer mensaje del lote, aplicar retardo aleatorio para no enviar en ráfaga
      if (i > 0) {
        const delayMs = getRandomDelay();
        console.log(`⏱️ Espaciando siguiente envío por ${(delayMs / 1000).toFixed(1)} segundos...`);
        await sleep(delayMs);
      }

      console.log(`📤 Enviando mensaje ID #${msg.id} a ${msg.contact}...`);

      try {
        await sendWhatsAppMessage(msg.contact, msg.message);
        const now = new Date().toISOString();
        updateMessageStatus(msg.id, {
          status: 'sent',
          sent_at: now
        });
        console.log(`✅ Mensaje ID #${msg.id} enviado exitosamente.`);
      } catch (err) {
        console.error(`❌ Error al enviar mensaje ID #${msg.id}:`, err.message);
        updateMessageStatus(msg.id, {
          status: 'failed',
          error: err.message
        });
      }
    }
  } catch (err) {
    console.error('❌ Error inesperado en el ciclo del scheduler:', err);
  } finally {
    isCronRunning = false;
  }
}

/**
 * Inicializa la tarea de cron (se ejecuta cada minuto).
 */
function initScheduler() {
  // Ejecuta cada minuto al segundo 0: "* * * * *"
  cron.schedule('* * * * *', () => {
    processDueMessages();
  });

  console.log('⏱️ Scheduler inicializado (revisión cada minuto).');
}

module.exports = {
  initScheduler,
  processDueMessages
};
