import { readFileSync } from 'node:fs';
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const re = /(dsh-llm|dsh-credentials|dsh-settings|dsh-timeout|dsh-anonymous-user-id)($|\/|@)/;
for (const [k, v] of Object.entries(lock.packages || {})) {
  const short = k.replace(/^node_modules\//, '');
  if (re.test(k) && !/dsh-llm-(deepseek|pi-ai|replay|retry|mock)|dsh-settings-file/.test(short)) {
    const remote = v.resolved && /^https?:/.test(v.resolved) ? 'REMOTE ' + v.resolved.slice(0, 55) : 'file';
    console.log(`${short}  => ${v.version}  ${remote}`);
  }
}
