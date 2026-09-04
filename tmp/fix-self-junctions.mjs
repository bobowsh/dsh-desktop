import { readdirSync, lstatSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = "E:\\work\\dsh-desktop-me";
const STORE = join(ROOT, "data", "profiles", "node_modules");
const WEB = join(ROOT, "data", "profiles", "web", "node_modules");
const ROOT_NM = join(ROOT, "node_modules");

function targetOf(junctionPath) {
  const out = execFileSync("fsutil", ["reparsepoint", "query", junctionPath], { encoding: "utf8" });
  const m = out.match(/Substitute Name:\s+(.*)/);
  return m ? m[1].replace(/^\\\?\?\\/, "") : null;
}

// collect junction dirs at top level and one level inside @scope dirs
function* junctionDirs(base) {
  for (const e of readdirSync(base, { withFileTypes: true })) {
    const p = join(base, e.name);
    if (e.name.startsWith("@") && e.isDirectory() && !e.isSymbolicLink()) {
      for (const s of readdirSync(p, { withFileTypes: true })) {
        const sp = join(p, s.name);
        if (s.isSymbolicLink() || lstatSync(sp).isSymbolicLink()) yield sp;
      }
      continue;
    }
    if (e.isSymbolicLink() || lstatSync(p).isSymbolicLink()) yield p;
  }
}

function isReparse(p) {
  try {
    execFileSync("fsutil", ["reparsepoint", "query", p], { stdio: "pipe" });
    return true;
  } catch { return false; }
}

function findReal(name) {
  const cands = [join(ROOT_NM, name), join(WEB, name)];
  // pnpm store under web and root
  for (const nm of [WEB, ROOT_NM]) {
    const pnpm = join(nm, ".pnpm");
    if (!existsSync(pnpm)) continue;
    const scopeIdx = name.indexOf("+"); // @scope/pkg -> @scope+pkg
    const dirPrefix = name.replace("/", "+").replace("@", "");
    for (const d of readdirSync(pnpm)) {
      if (d.startsWith(dirPrefix + "@")) {
        const c = join(pnpm, d, "node_modules", name);
        if (existsSync(c)) cands.push(c);
      }
    }
  }
  return cands.find((c) => existsSync(join(c, "package.json"))) || cands.find((c) => existsSync(c)) || null;
}

const fixed = [], removed = [], same = [];
for (const jp of junctionDirs(STORE)) {
  const rel = jp.slice(STORE.length + 1);
  let t;
  try { t = targetOf(jp); } catch { continue; }
  if (!t) continue;
  const norm = t.replace(/\\/g, "/").toLowerCase();
  const own = jp.replace(/\\/g, "/").toLowerCase();
  // self-loop: target path equals the junction's own path
  if (norm !== own) continue;
  const real = findReal(rel);
  rmSync(jp);
  if (real) {
    mkdirSync(dirname(jp), { recursive: true });
    execFileSync("cmd", ["/c", "mklink", "/J", jp, real], { stdio: "pipe" });
    fixed.push(`${rel} -> ${real}`);
  } else {
    removed.push(rel);
  }
}
console.log("fixed:\n" + fixed.join("\n"));
if (removed.length) console.log("\nremoved (no real package found):\n" + removed.join("\n"));
