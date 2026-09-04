import fs from 'fs';

const WEB = 'E:/work/dsh-desktop-me/data/profiles/web';
const pkgPath = `${WEB}/package.json`;
const wsPath = `${WEB}/pnpm-workspace.yaml`;

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const overrides = (pkg.pnpm && pkg.pnpm.overrides) || {};
const keys = Object.keys(overrides);
if (keys.length === 0) {
  console.error('NO overrides found in package.json.pnpm.overrides — abort');
  process.exit(1);
}

// 1) strip the ignored "pnpm" field from package.json
delete pkg.pnpm;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 2) append overrides to pnpm-workspace.yaml (pnpm v11 home for overrides)
const lines = ['overrides:'];
for (const [k, v] of Object.entries(overrides)) {
  lines.push(`  ${JSON.stringify(k)}: ${v}`);
}
fs.appendFileSync(wsPath, '\n' + lines.join('\n') + '\n');

console.log(`OK: moved ${keys.length} overrides -> pnpm-workspace.yaml`);
console.log('sample:', JSON.stringify(Object.entries(overrides).slice(0, 2)));
