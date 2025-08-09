module.exports = {
  apps: [
    {
      name: "mantenimiento-api",
      script: "./server/index.js",
      watch: false,
      instances: "1",
      exec_mode: "fork",
      env: {
        NODE_ENV: "development",
        PORT: 3001,
        SOCKET_PORT: 3002
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
        SOCKET_PORT: 3002
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      combine_logs: true,
      max_memory_restart: "500M",
      autorestart: true,
      restart_delay: 5000,
      time: true
    }
  ]
}; 