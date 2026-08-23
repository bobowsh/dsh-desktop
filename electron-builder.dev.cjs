const packageJson = require('./package.json')

// The shared package.json `files` list is tuned for the Windows target and
// strips darwin prebuilds. When the dev build runs on macOS (package:dev:mac:*),
// keep darwin prebuilds and drop the other platforms' instead — otherwise the
// dev .app loses its native binaries (node-pty & friends) at runtime.
const isMac = process.platform === 'darwin'
const files = isMac
  ? packageJson.build.files
      .filter((f) => f !== '!**/prebuilds/darwin-*/**')
      .concat(['!**/prebuilds/win32-*/**', '!**/prebuilds/linux-*/**'])
  : packageJson.build.files

module.exports = {
  ...packageJson.build,
  files,
  appId: 'io.dsh.desktop.dev',
  productName: 'DSH Desktop Dev',
  directories: {
    ...packageJson.build.directories,
    output: 'dist-dev'
  },
  extraMetadata: {
    name: 'dsh-desktop-dev',
    productName: 'DSH Desktop Dev',
    dshDesktopChannel: 'development'
  },
  artifactName: 'dsh-desktop-dev-${os}-${arch}.${ext}',
  nsis: {
    ...packageJson.build.nsis,
    artifactName: 'dsh-desktop-dev-windows-${arch}-setup.${ext}'
  },
  publish: null
}
