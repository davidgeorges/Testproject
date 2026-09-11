function localExpoGoConfig(baseConfig) {
  const config = JSON.parse(JSON.stringify(baseConfig));

  // Local Expo Go sessions must remain accessible to testers who are not
  // signed in to the Expo account that owns the EAS project.
  delete config.owner;
  if (config.extra) {
    delete config.extra.eas;
  }

  return config;
}

module.exports = ({ config }) => {
  return process.env.EXPO_LOCAL_GO === 'true' ? localExpoGoConfig(config) : config;
};
