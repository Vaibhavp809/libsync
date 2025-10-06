// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support.
  isCSSEnabled: true,
});

// Add any custom config here.
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Enable the new architecture
config.resolver.unstable_enableNewArchitecture = true;

module.exports = config;