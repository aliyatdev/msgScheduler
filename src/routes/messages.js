const express = require('express');
const router = express.Router();
const {
  createScheduledMessage,
  listMessages,
  getMessageById,
  cancelMessage,
  getDueMessages
} = require('../db/db');
const { formatToJid } = require('../whatsapp/sendMessage');
const { isConnected } = require('../whatsapp/connection');

/**
 * GET /api/status
 * Retorna el estado del sistema y la conexión a WhatsApp
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    whatsappConnected: isConnected(),
    serverTime: new Date().toISOString()
  });
});

/**
 * POST /api/auth/verify
 * Verifica si el token es válido
 */
router.post('/auth/verify', (req, res) => {
  res.json({ success: true, message: 'Token válido' });
});

/**
 * GET /api/messages
 * Lista los mensajes con filtros opcionales
 */
router.get('/messages', (req, res) => {
  try {
    const { status, limit } = req.query;
    const parsedLimit = limit ? parseInt(limit, 10) : 50;

    const messages = listMessages({
      status: status || undefined,
      limit: isNaN(parsedLimit) ? 50 : parsedLimit
    });

    res.json({
      success: true,
      messages
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/messages
 * Programa un nuevo mensaje
 */
router.post('/messages', (req, res) => {
  try {
    const { contact, message, send_at } = req.body;

    if (!contact || typeof contact !== 'string' || contact.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'El campo "contact" es obligatorio y debe ser un número o JID válido.'
      });
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'El campo "message" es obligatorio y no puede estar vacío.'
      });
    }

    if (!send_at) {
      return res.status(400).json({
        success: false,
        error: 'El campo "send_at" es obligatorio (formato ISO 8601 o fecha válida).'
      });
    }

    const scheduledDate = new Date(send_at);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'La fecha "send_at" no tiene un formato válido.'
      });
    }

    const normalizedJid = formatToJid(contact);
    const isoSendAt = scheduledDate.toISOString();

    const created = createScheduledMessage({
      contact: normalizedJid,
      message: message.trim(),
      send_at: isoSendAt
    });

    res.status(201).json({
      success: true,
      message: created
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/messages/:id/cancel
 * Cancela un mensaje programado que esté en estado 'pending'
 */
router.post('/messages/:id/cancel', (req, res) => {
  try {
    const { id } = req.params;
    const cancelled = cancelMessage(id);

    res.json({
      success: true,
      message: cancelled
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
