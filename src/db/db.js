const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../data/scheduler.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function initDb() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

// Inicializar esquemas al cargar módulo
initDb();

/**
 * Inserta un nuevo mensaje programado
 * @param {Object} params
 * @param {string} params.contact - JID normalizado (ej: 521234567890@s.whatsapp.net)
 * @param {string} params.message - Texto a enviar
 * @param {string} params.send_at - Timestamp ISO 8601 (YYYY-MM-DDTHH:mm:ssZ o YYYY-MM-DD HH:mm:ss)
 */
function createScheduledMessage({ contact, message, send_at }) {
  const stmt = db.prepare(`
    INSERT INTO scheduled_messages (contact, message, send_at, status)
    VALUES (?, ?, ?, 'pending')
  `);
  const info = stmt.run(contact, message, send_at);
  return getMessageById(info.lastInsertRowid);
}

/**
 * Obtiene un mensaje por ID
 * @param {number|string} id 
 */
function getMessageById(id) {
  const stmt = db.prepare('SELECT * FROM scheduled_messages WHERE id = ?');
  return stmt.get(id);
}

/**
 * Obtiene los mensajes pendientes cuya fecha/hora programada ya se cumplió.
 * @param {string} currentTimestamp - ISO string representativo de la hora actual
 */
function getDueMessages(currentTimestamp) {
  const time = currentTimestamp || new Date().toISOString();
  const stmt = db.prepare(`
    SELECT * FROM scheduled_messages 
    WHERE status = 'pending' AND send_at <= ?
    ORDER BY send_at ASC
  `);
  return stmt.all(time);
}

/**
 * Actualiza el estado de un mensaje
 * @param {number|string} id 
 * @param {Object} updates
 * @param {string} updates.status - 'sent', 'failed', 'cancelled'
 * @param {string} [updates.sent_at]
 * @param {string} [updates.error]
 */
function updateMessageStatus(id, { status, sent_at = null, error = null }) {
  const stmt = db.prepare(`
    UPDATE scheduled_messages
    SET status = ?, sent_at = ?, error = ?
    WHERE id = ?
  `);
  stmt.run(status, sent_at, error, id);
  return getMessageById(id);
}

/**
 * Cancela un mensaje programado solo si su estado es 'pending'.
 * @param {number|string} id 
 */
function cancelMessage(id) {
  const stmt = db.prepare(`
    UPDATE scheduled_messages
    SET status = 'cancelled'
    WHERE id = ? AND status = 'pending'
  `);
  const result = stmt.run(id);
  if (result.changes === 0) {
    const msg = getMessageById(id);
    if (!msg) {
      throw new Error('El mensaje no existe.');
    }
    throw new Error(`No se puede cancelar un mensaje con estado '${msg.status}'.`);
  }
  return getMessageById(id);
}

/**
 * Lista mensajes ordenados cronológicamente
 * @param {Object} [filter]
 * @param {string} [filter.status]
 * @param {number} [filter.limit=50]
 */
function listMessages({ status, limit = 50 } = {}) {
  if (status) {
    const stmt = db.prepare(`
      SELECT * FROM scheduled_messages 
      WHERE status = ?
      ORDER BY send_at DESC 
      LIMIT ?
    `);
    return stmt.all(status, limit);
  }

  const stmt = db.prepare(`
    SELECT * FROM scheduled_messages 
    ORDER BY send_at DESC 
    LIMIT ?
  `);
  return stmt.all(limit);
}

module.exports = {
  db,
  initDb,
  createScheduledMessage,
  getMessageById,
  getDueMessages,
  updateMessageStatus,
  cancelMessage,
  listMessages
};
