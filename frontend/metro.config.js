const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Windows: ignore Android/Kotlin build caches under node_modules (UNKNOWN scandir crashes).
const winBuildBlock = /node_modules[\\/].*(?:[\\/]android[\\/]build[\\/]|[\\/]\.cxx[\\/]|[\\/]build[\\/]kotlin[\\/]).*/;
const defaultBlock = config.resolver.blockList;
config.resolver.blockList = defaultBlock
  ? new RegExp(`${defaultBlock.source}|${winBuildBlock.source}`, defaultBlock.flags || 'i')
  : winBuildBlock;

const defaultResolveRequest = config.resolver.resolveRequest;

/**
 * Firebase JS: `firebase/auth` re-exports `@firebase/auth`. Metro must resolve
 * `@firebase/auth` to the React Native entry on native, or Auth never registers
 * and you get: "Component auth has not been registered yet".
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    (platform === 'android' || platform === 'ios') &&
    moduleName === '@firebase/auth'
  ) {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@firebase/auth/dist/rn/index.js'),
      type: 'sourceFile',
    };
  }
  if (typeof defaultResolveRequest === 'function') {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
