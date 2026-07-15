const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.resolver.blockList = [/[/\\]app[/\\].*\.test\.[jt]sx?$/];

module.exports = withNativeWind(config, { input: './global.css' });
