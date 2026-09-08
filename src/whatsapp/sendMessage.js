const { getSocket, isConnected } = require('./connection');

/**
 * Normaliza y formatea un número de teléfono o JID para WhatsApp.
 * Elimina espacios, guiones y signos +.
 * Asegura el sufijo @s.whatsapp.net para números individuales.
 * @param {string} contact 
 * @returns {string}
 */
function formatToJid(contact) {
  if (!contact) {
    throw new Error('El contacto o número de teléfono es obligatorio.');
  }

  let cleaned = String(contact).trim().replace(/[\s\+\-()]/g, '');

  let [numPart, domain] = cleaned.split('@');
  if (!domain) {
    domain = 's.whatsapp.net';
  }

  // Manejo de números de México:
  // 10 dígitos (ej. 3325376609) -> 5213325376609
  if (numPart.length === 10) {
    numPart = `521${numPart}`;
  } 
  // 12 dígitos que empiezan con 52 pero no 521 (ej. 523325376609) -> 5213325376609
  else if (numPart.length === 12 && numPart.startsWith('52') && !numPart.startsWith('521')) {
    numPart = `521${numPart.slice(2)}`;
  }

  return `${numPart}@${domain}`;
}

/**
 * Envía un mensaje de texto por WhatsApp usando el socket activo.
 * @param {string} contact - JID o número de teléfono
 * @param {string} message - Contenido del mensaje de texto
 * @returns {Promise<any>}
 */
async function sendWhatsAppMessage(contact, message) {
  const sock = getSocket();

  if (!sock || !isConnected()) {
    throw new Error('El cliente de WhatsApp no está conectado o la sesión no está lista.');
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('El mensaje no puede estar vacío.');
  }

  let targetJid = formatToJid(contact);

  // Consultar a WhatsApp si el número existe y obtener su JID canónico
  try {
    const check = await sock.onWhatsApp(targetJid);
    if (check && check.length > 0 && check[0].exists) {
      targetJid = check[0].jid;
    } else {
      throw new Error(`El número ${contact} no está registrado en WhatsApp.`);
    }
  } catch (err) {
    if (err.message.includes('no está registrado')) {
      throw err;
    }
    console.warn(`Aviso: No se pudo verificar onWhatsApp para ${targetJid}:`, err.message);
  }

  const result = await sock.sendMessage(targetJid, { text: message });
  return result;
}

module.exports = {
  formatToJid,
  sendWhatsAppMessage
};
