// Dynamic Expo config — reads APP_VARIANT from environment
// Replaces static app.json so we can inject build-time variables

const appJson = require("./app.json");

module.exports = ({ config }) => {
  return {
    ...config,
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      appVariant: process.env.APP_VARIANT || "full",
    },
  };
};
