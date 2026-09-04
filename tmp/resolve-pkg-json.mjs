import { readFileSync, writeFileSync } from 'node:fs';

const path = 'package.json';
let txt = readFileSync(path, 'utf8');

// Split on conflict markers, keep non-conflict segments as-is.
const re = /<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> upstream\/main\n/g;

let hunk = 0;
txt = txt.replace(re, (_m, head, up) => {
  hunk++;
  if (hunk === 1) {
    // scripts: keep local sync-harness-pkgs dev prefix, adopt upstream build:market
    return [
      '    "dev": "node scripts/sync-harness-pkgs.mjs && electron-vite dev",',
      '    "build": "npm run build:market && electron-vite build",',
      '    "build:market": "tsc -p packages/dshmarket/tsconfig.json",\n',
    ].join('\n');
  }
  if (hunk === 2) {
    // dependencies: take upstream rc.1 block wholesale; local-only alpha.1 demo
    // packages (spine-demo, tool-subagent-report) are intentionally dropped upstream.
    return up;
  }
  if (hunk === 3) {
    // union: upstream kimi-ppt + dshmarket, plus local chardet + dsh-llm-opencode fork
    return (
      up +
      '    "chardet": "^2.2.0",\n' +
      '    "dsh-llm-opencode": "github:bobowsh/dsh-llm-opencode",\n'
    );
  }
  return up;
});

// Pin local portable release version (upstream stays 0.1.1; we ship 0.3.x).
const pkg = JSON.parse(txt);
pkg.version = '0.3.2';
// Ensure local-only deps survive regardless of hunk placement.
pkg.dependencies['chardet'] = pkg.dependencies['chardet'] || '^2.2.0';
pkg.dependencies['dsh-llm-opencode'] = pkg.dependencies['dsh-llm-opencode'] || 'github:bobowsh/dsh-llm-opencode';
// Dropped upstream-removed alpha.1 demo/report packages:
delete pkg.dependencies['@deepseek-ai/dsh-agent-spine-demo'];
delete pkg.dependencies['@deepseek-ai/dsh-tool-subagent-report'];

writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
console.log('OK. version =', pkg.version);
console.log('deps count =', Object.keys(pkg.dependencies).length);
console.log('has dshmarket =', !!pkg.dependencies['dshmarket']);
console.log('has dsh-kimi-ppt =', !!pkg.dependencies['dsh-kimi-ppt']);
console.log('has chardet =', !!pkg.dependencies['chardet']);
console.log('has dsh-llm-opencode =', !!pkg.dependencies['dsh-llm-opencode']);
console.log('spine-demo present =', !!pkg.dependencies['@deepseek-ai/dsh-agent-spine-demo']);
