module.exports = {
  apps: [
    {
      name: "api-server",
      script: "/home/ec2-user/shift-app/api-server/dist/server.js",
      cwd: "/home/ec2-user/shift-app/api-server",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "3001"
      },
      watch: false,
      max_memory_restart: "500M"
    }
  ]
};
