let currentFilter = '';
let authToken = localStorage.getItem('ws_auth_token') || '';

// Elementos DOM
const tokenModal = document.getElementById('token-modal');
const tokenInput = document.getElementById('token-input');
const saveTokenBtn = document.getElementById('save-token-btn');
const tokenConfigBtn = document.getElementById('token-config-btn');
const connectionBadge = document.getElementById('connection-badge');
const connectionStatusText = document.getElementById('connection-status-text');
const scheduleForm = document.getElementById('schedule-form');
const contactInput = document.getElementById('contact-input');
const messageInput = document.getElementById('message-input');
const sendAtInput = document.getElementById('send-at-input');
const messagesContainer = document.getElementById('messages-container');
const filterChips = document.querySelectorAll('.filter-chip');
const refreshBtn = document.getElementById('refresh-btn');
const toastContainer = document.getElementById('toast-container');

// Inicializar fecha por defecto (actual + 1 hora)
function setDefaultDateTime() {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5); // Redondear a múltiplo de 5 min
  now.setSeconds(0);
  now.setMilliseconds(0);

  // Formato local YYYY-MM-DDTHH:mm
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  sendAtInput.value = localIso;
  sendAtInput.min = new Date(Date.now() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

// Toast Notificaciones
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// API Helper con Token
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-token': authToken,
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (response.status === 401) {
    showTokenModal();
    throw new Error('Token no autorizado. Por favor ingresa tu AUTH_TOKEN.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error en la petición al servidor.');
  }

  return data;
}

// Manejo de Modal de Token
function showTokenModal() {
  tokenInput.value = authToken;
  tokenModal.classList.remove('hidden');
  tokenInput.focus();
}

function hideTokenModal() {
  tokenModal.classList.add('hidden');
}

saveTokenBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  if (!token) return;

  authToken = token;
  localStorage.setItem('ws_auth_token', token);
  hideTokenModal();

  showToast('Token guardado. Verificando...', 'success');
  await checkConnectionStatus();
  await loadMessages();
});

tokenConfigBtn.addEventListener('click', () => {
  showTokenModal();
});

// Verificación de estado de WhatsApp
async function checkConnectionStatus() {
  if (!authToken) {
    connectionBadge.className = 'badge badge-disconnected';
    connectionStatusText.textContent = 'Token pendiente';
    return;
  }

  try {
    const data = await apiRequest('/api/status');
    if (data.whatsappConnected) {
      connectionBadge.className = 'badge badge-connected';
      connectionStatusText.textContent = 'WhatsApp Conectado';
    } else {
      connectionBadge.className = 'badge badge-disconnected';
      connectionStatusText.textContent = 'WhatsApp Desconectado';
    }
  } catch (err) {
    connectionBadge.className = 'badge badge-disconnected';
    connectionStatusText.textContent = 'Error de conexión';
  }
}

// Cargar y renderizar mensajes
async function loadMessages() {
  if (!authToken) {
    messagesContainer.innerHTML = '<div class="empty-state">Ingresa tu AUTH_TOKEN para ver los mensajes.</div>';
    return;
  }

  try {
    const url = currentFilter 
      ? `/api/messages?status=${encodeURIComponent(currentFilter)}`
      : '/api/messages';
    
    const data = await apiRequest(url);
    const messages = data.messages || [];

    if (messages.length === 0) {
      messagesContainer.innerHTML = '<div class="empty-state">No hay mensajes registrados con este filtro.</div>';
      return;
    }

    messagesContainer.innerHTML = messages.map(msg => renderMessageCard(msg)).join('');

    // Agregar listeners a botones de cancelación
    document.querySelectorAll('.btn-cancel').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!confirm(`¿Estás seguro de cancelar el mensaje #${id}?`)) return;
        await cancelScheduledMessage(id);
      });
    });

  } catch (err) {
    messagesContainer.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

function renderMessageCard(msg) {
  const sendDate = new Date(msg.send_at).toLocaleString();
  const createdDate = new Date(msg.created_at).toLocaleString();
  const sentDate = msg.sent_at ? new Date(msg.sent_at).toLocaleString() : null;

  const statusLabels = {
    pending: 'Pendiente',
    sent: 'Enviado',
    failed: 'Fallido',
    cancelled: 'Cancelado'
  };

  const statusText = statusLabels[msg.status] || msg.status;

  return `
    <div class="message-item">
      <div class="message-item-header">
        <span class="message-recipient">📱 ${escapeHtml(msg.contact)}</span>
        <span class="status-tag status-${msg.status}">${statusText}</span>
      </div>
      <div class="message-body">${escapeHtml(msg.message)}</div>
      <div class="message-meta">
        <div>
          <span>🗓️ Programado: <strong>${sendDate}</strong></span>
          ${sentDate ? ` &bull; <span>Enviado: ${sentDate}</span>` : ''}
        </div>
        ${msg.status === 'pending' ? `<button class="btn-cancel" data-id="${msg.id}">Cancelar</button>` : ''}
      </div>
      ${msg.error ? `<div class="error-hint">⚠️ Error: ${escapeHtml(msg.error)}</div>` : ''}
    </div>
  `;
}

async function cancelScheduledMessage(id) {
  try {
    await apiRequest(`/api/messages/${id}/cancel`, { method: 'POST' });
    showToast(`Mensaje #${id} cancelado correctamente.`, 'success');
    loadMessages();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Manejo del Formulario
scheduleForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const contact = contactInput.value.trim();
  const message = messageInput.value.trim();
  const sendAtValue = sendAtInput.value;

  if (!contact || !message || !sendAtValue) {
    showToast('Por favor completa todos los campos.', 'error');
    return;
  }

  // Convertir a ISO 8601 en hora local
  const sendAtIso = new Date(sendAtValue).toISOString();

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Programando...';

  try {
    await apiRequest('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        contact,
        message,
        send_at: sendAtIso
      })
    });

    showToast('Mensaje programado exitosamente.', 'success');
    messageInput.value = '';
    setDefaultDateTime();
    loadMessages();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Programar Envío';
  }
});

// Filtros
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.status;
    loadMessages();
  });
});

refreshBtn.addEventListener('click', () => {
  loadMessages();
  checkConnectionStatus();
  showToast('Actualizado', 'success');
});

// Helper de escape HTML
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDateTime();

  if (!authToken) {
    showTokenModal();
  } else {
    checkConnectionStatus();
    loadMessages();
  }

  // Polling periódico de estado y lista
  setInterval(() => {
    if (authToken) {
      checkConnectionStatus();
      loadMessages();
    }
  }, 15000);
});
