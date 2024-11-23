module.exports = {
  apps: [
    {
      name: "my-app",
      script: "app.js",  // Dein Hauptscript
      env: {
        PORT: process.env.PORT || 11000,  // Default Port, wenn nicht gesetzt
        FLASK_APP_PORT: process.env.FLASK_APP_PORT || 7000 // Default Flask Port
      }
    }
  ]
};
