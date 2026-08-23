const packageJson = require('./package.json')

// macOS release config. The shared package.json `files` list is tuned for the
// Windows target and strips darwin prebuilds — on macOS that would remove the
// native binaries (node-pty & friends) the app itself needs at runtime. Keep
// darwin prebuilds here and drop the other platforms' instead. The bundled
// profile tree (data/profiles/web) is trimmed per-platform by
// scripts/bundle-user-data.mjs, which runs on the target machine.
const files = packageJson.build.files
  .filter((f) => f !== '!**/prebuilds/darwin-*/**')
  .concat(['!**/prebuilds/win32-*/**', '!**/prebuilds/linux-*/**'])

module.exports = {
  ...packageJson.build,
  files
}
