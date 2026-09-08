# Proyecto: Scheduler de mensajes de WhatsApp (empresa)

## Qué es esto
Herramienta personal para programar el envío de mensajes de WhatsApp desde el
número de la empresa. Permite redactar un mensaje en cualquier momento y que
se envíe automáticamente a una fecha/hora definida (ej. redactar a las 11pm,
enviar a las 8am), para no mandar mensajes fuera de horario laboral.

## Uso y alcance
- Uso individual: solo yo voy a usar esta herramienta.
- Bajo volumen de mensajes (no es una herramienta de envío masivo/marketing).
- Sin presupuesto: NO se usa la WhatsApp Business API oficial de Meta.
- Sin sistema de login/roles por ahora (se puede agregar después si se vuelve
  multiusuario).
- Sin app nativa de Android — es una aplicación web.

## Stack técnico (ya decidido, no cambiar sin confirmar conmigo)
- **Backend:** Node.js
- **Conexión a WhatsApp:** [Baileys](https://github.com/WhiskeySockets/Baileys)
  — librería no oficial que emula el protocolo de WhatsApp Web. Vinculación
  por código QR, sesión persistente guardada en disco (auth state).
- **Base de datos:** SQLite (archivo local, sin servidor de BD aparte, ej. `better-sqlite3`).
- **Scheduler:** `node-cron`, revisando cada minuto si hay mensajes
  pendientes cuya fecha/hora ya se cumplió.
- **Frontend:** aplicación web simple (HTML/CSS/JS o React, lo que sea más
  rápido de mantener) con un formulario: contacto, mensaje, fecha/hora.
- **Hospedaje:** VPS Linux estándar (DigitalOcean Droplet o similar) con Node.js
  y pm2 para mantener el proceso vivo 24/7. El código debe ser agnóstico al proveedor.

## Estructura de carpetas propuesta
```
whatsapp-scheduler/
├── GEMINI.md
├── package.json
├── .env.example
├── .gitignore
├── src/
│   ├── index.js              # arranque del servidor + conexión Baileys
│   ├── whatsapp/
│   │   ├── connection.js      # setup de Baileys, manejo de sesión/QR
│   │   └── sendMessage.js     # función para enviar un mensaje
│   ├── scheduler/
│   │   └── cron.js            # tarea que revisa mensajes pendientes
│   ├── db/
│   │   ├── schema.sql
│   │   └── db.js              # conexión y queries a SQLite
│   ├── routes/
│   │   └── messages.js        # endpoints: crear, listar, cancelar mensajes
│   └── public/                 # frontend estático (o carpeta del build)
├── auth_session/               # sesión de Baileys (NUNCA subir a git)
└── data/
    └── scheduler.db            # base de datos SQLite (NUNCA subir a git)
```

## Modelo de datos (tabla `scheduled_messages`)
| Campo        | Tipo      | Notas                                  |
|--------------|-----------|-----------------------------------------|
| id           | INTEGER PK| autoincrement                          |
| contact      | TEXT      | número en formato `52XXXXXXXXXX@s.whatsapp.net` |
| message      | TEXT      | contenido del mensaje                  |
| send_at      | DATETIME  | fecha/hora programada de envío         |
| status       | TEXT      | `pending` / `sent` / `failed`          |
| created_at   | DATETIME  | default now                            |
| sent_at      | DATETIME  | nullable, se llena al enviarse         |
| error        | TEXT      | nullable, mensaje de error si falló    |

## Convenciones de código
- JavaScript moderno utilizando CommonJS por simplicidad y compatibilidad con Baileys.
- Nombres de archivos, funciones y variables en inglés; mensajes de usuario/logs pueden ir en español.
- Manejo de errores explícito en cada envío: si un mensaje falla, se actualiza a `status = 'failed'` guardando el error.
- No mandar mensajes en ráfaga: si hay varios pendientes a la misma hora, espaciar los envíos con retrasos aleatorios de unos segundos.
- Toda configuración sensible (puertos, rutas de sesión, tokens) se lee de `.env`, nunca hardcodeada.

## Seguridad y restricciones críticas
- NUNCA commitear ni subir a git `auth_session/`, `data/scheduler.db` ni archivos `.env`. Deben estar en `.gitignore`.
- Nunca exponer los endpoints sin autenticación básica (un middleware simple de token/contraseña).
- No implementar funciones de envío masivo ni listas de difusión.

## Rol y directrices de trabajo para Gemini / AGY
- Nivel técnico: respuestas concisas y directas, sin explicaciones elementales de JavaScript o Node.js.
- Desarrollo incremental: avanzar un componente a la vez. Validar que la sesión con Baileys persista antes de pasar a la base de datos o el cron.
- Antes de instalar una dependencia nueva con `npm`, indicar en una sola línea cuál es y para qué sirve.
- Proponer o correr scripts de prueba mínimos (`console.log`, scripts de verificación) para validar cada parte antes de seguir.

## Comandos clave
```bash
npm install          # instalar dependencias
npm run dev          # correr en desarrollo
npm start            # correr en producción con pm2
```

## Hoja de ruta (Roadmap)
1. Inicializar proyecto Node.js + configurar Baileys.
2. Vincular vía QR y confirmar que la sesión persiste en disco (`auth_session/`).
3. Inicializar SQLite y crear tabla `scheduled_messages`.
4. Implementar endpoints REST para programar y listar mensajes.
5. Configurar `node-cron` para revisar pendientes y disparar envíos espaciados.
6. Construir interfaz web mínima (formulario + lista de programados).
7. Añadir protección básica de acceso (token/contraseña).
8. Documentar despliegue en VPS con `pm2`.