module.exports = {
  apps: [
    {
      name: "my-app",
      script: "app.js",  // Dein Hauptscript
      env: {
        PORT: 11000,
        FLASK_APP_PORT: 7000
      }
    }
  ]
};
