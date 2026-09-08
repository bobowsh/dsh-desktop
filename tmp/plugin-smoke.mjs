import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const pluginRoot = "E:/work/dsh-desktop-me/data/profiles/.generations/live/dsh-rules-manager+1.5.4+8a93902c543c/node_modules/dsh-rules-manager";
const req = createRequire(pluginRoot + "/package.json");
const entry = req.resolve("dsh-rules-manager");
const mod = await import(pathToFileURL(entry).href);
console.log("plugin entry loaded:", entry);
console.log("export keys:", Object.keys(mod));
console.log("default.apply?", typeof (mod.default?.apply), " apply?", typeof mod.apply, " name?", mod.name ?? mod.default?.name);