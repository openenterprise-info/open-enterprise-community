module.exports = {
  apps: [
    {
      name: "server",
      script: "server/src/index.js",
      env: { SERVER_PORT: 3001, NODE_ENV: "production" },
    },
    {
      name: "processor",
      script: "processor/src/index.js",
      env: { PROCESSOR_PORT: 3002, NODE_ENV: "production" },
    },
  ],
};
