// Commercial routes — auto-loaded when license vars match enterprise values
function register(app) {
  const { router: ssoRoutes }  = require("../../server/src/routes/sso");
  const superAdminRoutes       = require("../../server/src/routes/superadmin");
  const agentBuilderRoutes     = require("../../server/src/routes/agentBuilder");

  app.use("/api/sso",           ssoRoutes);
  app.use("/api/superadmin",    superAdminRoutes);
  app.use("/api/agent-builder", agentBuilderRoutes);
}

module.exports = { register };
