import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync(process.env.TEMP + '/dsh-catalog/package/plugins.json', 'utf8'));
const plugins = data.plugins || data;

const wanted = [
  'omdsh-dev/DSH-better-sidebar',
  'zhu1090093659/dsh-web#packages/dsh-git-graph',
  'omdsh-dev/dsh-mnemon',
  'awesome-dsh-plugin/dsh-find-plugin',
  'Nwflower/dsh-chat-import',
  'tt-a1i/archify#integrations/deepseek-harness',
  'MichengAI/dsh-skills-manager',
  'HsiangNianian/dsh-auto-continue',
  'xiajiajun516/dsh-config-manager',
  'RGarvel/dsh-channel-view',
  'bbqisbbq/dsh-tiddlywiki',
  'ryasrk/dsh-awesome-skills',
  'omdsh-dev/dsh-genui',
  'Nagi-ovo/dsh-visualize',
  'Jiao-XXX/dsh-auto-approve',
  'wulun811/dsh-plugin-vet',
  '01Virex/dsh-status-rotator',
  'Js2Hou/dsh-mcp-manager',
];

function ghKey(url) {
  const m = String(url || '').match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!m) return null;
  return (m[1] + '/' + m[2]).replace(/\.git$/, '').toLowerCase();
}

const results = [];
for (const w of wanted) {
  const [repoPart, sub] = w.split('#');
  const key = repoPart.toLowerCase();
  let matches = plugins.filter(p => ghKey(p.url) === key);
  if (sub) {
    const leaf = sub.split('/').pop().toLowerCase();
    const narrowed = matches.filter(p =>
      (p.npm && p.npm.toLowerCase().includes(leaf)) ||
      (p.name && p.name.toLowerCase() === leaf) ||
      (p.url && p.url.toLowerCase().includes(leaf))
    );
    if (narrowed.length) matches = narrowed;
  }
  results.push({ wanted: w, matches: matches.map(p => ({
    name: p.name, owner: p.owner, url: p.url, npm: p.npm || null,
    tarball: p.tarball || null, install: p.install || null, category: p.category,
  })) });
}

for (const r of results) {
  console.log('=== ' + r.wanted + ' (' + r.matches.length + ' match)');
  for (const m of r.matches) {
    console.log('  npm:', m.npm, '| name:', m.name, '| cat:', m.category);
    console.log('  url:', m.url);
    if (m.install) console.log('  install:', m.install);
  }
  if (!r.matches.length) console.log('  !! NOT FOUND');
}
fs.writeFileSync(process.env.TEMP + '/dsh-catalog/resolve.json', JSON.stringify(results, null, 2));
