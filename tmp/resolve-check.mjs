import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const gen = "E:/work/dsh-desktop-me/data/profiles/.generations/live/dsh-rules-manager+1.5.4+8a93902c543c/node_modules/dsh-rules-manager";
const req = createRequire(gen + "/package.json");
for (const dep of ["dsh-rules-manager-client","@deepseek-ai/cordis","@deepseek-ai/dsh-home-paths","@deepseek-ai/dsh-typert-protocol"]) {
  try { console.log("OK  ", dep, "->", req.resolve(dep)); }
  catch (e) { console.log("FAIL", dep, "->", e.code || e.message); }
}
// load the client entry to prove it is real
const pj = req(req.resolve("dsh-rules-manager-client/package.json"));
console.log("client pkg main/exports:", pj.main || JSON.stringify(pj.exports||{}).slice(0,120));
