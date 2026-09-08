# WhatsApp Scheduler

Herramienta ligera y personal para programar y diferir el envío de mensajes de WhatsApp utilizando Baileys, SQLite y `node-cron`.

## Características
- **Conexión Baileys:** Emulación de WhatsApp Web con sesión persistente en disco (`auth_session/`).
- **Base de datos SQLite:** Persistencia local ultraligera con `better-sqlite3` en `data/scheduler.db`.
- **Scheduler Automático:** Tarea en segundo plano con `node-cron` que revisa cada minuto y envía mensajes pendientes.
- **Espaciado inteligente:** Evita envíos en ráfaga añadiendo retardos aleatorios entre mensajes.
- **Protección de API:** Middleware de autenticación mediante `AUTH_TOKEN`.
- **Interfaz Web Limpia:** Formulario intuitivo para programar mensajes, monitorizar el estado de conexión y cancelar mensajes pendientes.

---

## Estructura del Proyecto

```
whatsapp-scheduler/
├── agy.md                  # Especificación y roadmap del proyecto
├── ecosystem.config.js     # Configuración para PM2 en producción
├── package.json
├── .env.example
├── .gitignore
├── src/
│   ├── index.js            # Servidor HTTP Express + arranque Baileys y cron
│   ├── middleware/
│   │   └── auth.js         # Protección de endpoints por token
│   ├── whatsapp/
│   │   ├── connection.js   # Manejo de socket Baileys, reconexión y QR
│   │   └── sendMessage.js  # Normalización de JID y envío de mensajes
│   ├── scheduler/
│   │   └── cron.js         # Cron job con espaciado entre envíos
│   ├── db/
│   │   ├── schema.sql      # Esquema e índices de SQLite
│   │   └── db.js           # Consultas y operaciones de BD
│   ├── routes/
│   │   └── messages.js     # Endpoints REST (/api/status, /api/messages)
│   └── public/             # Interfaz web estática (HTML, CSS, JS)
├── auth_session/           # Credenciales y llaves de Baileys (ignorado en git)
└── data/
    └── scheduler.db        # Base de datos SQLite (ignorado en git)
```

---

## Configuración Inicial

1. **Clonar e instalar dependencias:**
   ```bash
   git clone <repo-url>
   cd whatsappScheduler
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   Edita `.env` para definir un token seguro y el puerto deseado:
   ```env
   PORT=3000
   AUTH_TOKEN=mi_token_secreto_super_seguro
   SESSION_PATH=./auth_session
   DB_PATH=./data/scheduler.db
   ```

### ¿Qué es el `AUTH_TOKEN` y cómo generarlo?
El `AUTH_TOKEN` **no proviene de Meta ni de ningún servicio externo**. Es una **contraseña o clave de acceso personal** que tú defines para proteger tu aplicación y evitar que terceras personas en tu red o en internet puedan programar mensajes desde tu número.

- **Dónde se configura:** En el archivo local `.env` bajo la variable `AUTH_TOKEN=...`.
- **Cómo crear uno:** Puedes escribir cualquier contraseña de tu elección o generar una clave aleatoria y segura por terminal ejecutando:
  ```bash
  openssl rand -hex 16
  ```
- **Cómo se usa:** Al abrir la interfaz web (`http://localhost:3000`), una ventana emergente te solicitará este token. Lo introduces una sola vez y el navegador lo guardará en `localStorage` para autorizar todas las peticiones posteriores.

---

## Ejecución en Desarrollo y Vinculación

1. **Iniciar el servidor:**
   ```bash
   npm run dev
   ```

2. **Vincular WhatsApp:**
   - En la consola aparecerá un código QR (o puedes abrir `qr.png`).
   - Abre WhatsApp en tu teléfono > **Dispositivos vinculados** > **Vincular un dispositivo** y escanea el código.
   - Una vez vinculado, la sesión queda guardada en `auth_session/` y no será necesario volver a escanear.

3. **Abrir la interfaz web:**
   - Navega a `http://localhost:3000`.
   - Ingresa tu `AUTH_TOKEN` en la ventana emergente.
   - ¡Listo! Podrás programar mensajes indicando el número (ej. `+52 55 1234 5678`), el texto y la fecha/hora.

---

## Despliegue en VPS (Producción con PM2)

En un servidor Linux (Ubuntu/Debian) estándar:

1. **Instalar Node.js y PM2 globalmente:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Preparar el proyecto en el servidor:**
   ```bash
   mkdir -p /var/www/whatsapp-scheduler
   cd /var/www/whatsapp-scheduler
   # Clonar o copiar el código fuente
   npm install --production
   cp .env.example .env
   # Editar .env con tus valores de producción
   nano .env
   ```

3. **Primera vinculación en VPS:**
   Ejecuta temporalmente de forma manual para escanear el QR:
   ```bash
   node src/index.js
   ```
   Escanea el QR. Una vez confirmada la conexión (`✅ Conexión con WhatsApp establecida`), detén el proceso con `Ctrl + C`.

4. **Iniciar con PM2:**
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

5. **Comandos útiles de PM2:**
   - Ver logs en tiempo real: `pm2 logs whatsapp-scheduler`
   - Ver estado del proceso: `pm2 status`
   - Reiniciar servicio: `pm2 restart whatsapp-scheduler`
   - Detener servicio: `pm2 stop whatsapp-scheduler`

---

## Seguridad
- `auth_session/`, `data/` y `.env` están configurados en `.gitignore` y **nunca** deben subirse al repositorio.
- Todos los endpoints en `/api/*` requieren el encabezado `x-api-token` o `Authorization: Bearer <AUTH_TOKEN>`.
