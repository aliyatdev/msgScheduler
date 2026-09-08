module.exports = {
  apps: [
    {
      name: 'whatsapp-scheduler',
      script: 'src/index.js',
      instances: 1, // Baileys y SQLite requieren instancia única
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
