module.exports = {
  apps: [
    {
      name: "TripNusBackendWebsocket",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "TripNusBackendWorkers",
      script: "dist/workers/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
