// dsh-skill-manager-ytxue core 单元测试（临时根，跑完即删）
import { auditSkills, enableSkill, disableSkill, findProjectRoot, importSkill, importPath, listDir, state } from "../lib/core.js";
import { mkdir, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 测试临时根：默认在系统临时目录（跨平台、无 .git 祖先干扰 findProjectRoot 断言）；
// 可用环境变量 SM_TEST_HOME 覆盖
import { tmpdir } from "node:os";
const HOME = process.env.SM_TEST_HOME || join(tmpdir(), "dsh-skill-manager-ytxue-test");
await rm(HOME, { recursive: true, force: true });
await mkdir(join(HOME, "skills"), { recursive: true });
await mkdir(join(HOME, "skill-pool"), { recursive: true });
const log = async (e, d) => { /* quiet */ };

let pass = 0, fail = 0;
const check = (label, ok, detail = "") => { console.log((ok ? "PASS  " : "FAIL  ") + label + (ok ? "" : "  " + detail)); ok ? pass++ : fail++; };

// 1. 构造：skills 4 个不合规条目 + 1 个带 BOM 的合规条目 + pool 1 个合规条目（enable 语义 pool->skills）
await mkdir(join(HOME, "skills", "My_Bad_Skill"), { recursive: true });
await writeFile(join(HOME, "skills", "My_Bad_Skill", "SKILL.md"), "---\nname: My_Bad_Skill\n---\n# body\n");
await mkdir(join(HOME, "skills", "bool-skill"), { recursive: true });
await writeFile(join(HOME, "skills", "bool-skill", "SKILL.md"), "---\nname: bool-skill\ndescription: d\ndisableModelInvocation: true\nuser-invocable: yes\n---\nbody\n");
await mkdir(join(HOME, "skills", "desc-less"), { recursive: true });
await writeFile(join(HOME, "skills", "desc-less", "SKILL.md"), "---\nname: desc-less\n---\nbody\n");
await writeFile(join(HOME, "skills", "flat_bad.md"), "---\ndescription: flat\n---\nbody\n");
await mkdir(join(HOME, "skills", "bom-skill"), { recursive: true });
await writeFile(join(HOME, "skills", "bom-skill", "SKILL.md"), "\uFEFF---\nname: bom-skill\ndescription: bom ok\n---\nbody\n");
await mkdir(join(HOME, "skill-pool", "good-skill"), { recursive: true });
await writeFile(join(HOME, "skill-pool", "good-skill", "SKILL.md"), "---\nname: good-skill\ndescription: ok\n---\nbody\n");

// 2. 首次审计（全部未检查 → 全查 + 自动修复）
const r1 = await auditSkills(HOME, log);
const codes = r1.fixed.map((f) => f.code).sort();
check("audit checked 5", r1.checked.length === 5, JSON.stringify(r1.checked));
check("audit skipped 0 on first run", r1.skipped.length === 0);
check("audit fixed all kinds", ["bool-camel", "bool-type", "desc-fix", "dir-kebab", "name-fix"].every((c) => codes.includes(c)), JSON.stringify(codes));
check("audit renamed dir", (await readdir(join(HOME, "skills"))).includes("my-bad-skill"));
check("BOM skill parsed (no issues)", r1.checked.find((c) => c.name === "bom-skill").issues.length === 0, JSON.stringify(r1.checked.find((c) => c.name === "bom-skill")));
check("check state file written", (await readFile(join(HOME, "skill-manager-ytxue.checked.json"), "utf8")).includes("my-bad-skill"));

// 3. 修复后内容断言
const mb = await readFile(join(HOME, "skills", "my-bad-skill", "SKILL.md"), "utf8");
check("renamed fm name", /^name: my-bad-skill$/m.test(mb));
check("renamed has desc", /^description:/m.test(mb));
const bs = await readFile(join(HOME, "skills", "bool-skill", "SKILL.md"), "utf8");
check("bool key kebab", /^disable-model-invocation: true$/m.test(bs));
check("bool value fixed", /^user-invocable: true$/m.test(bs));
check("camel key removed", !/disableModelInvocation/.test(bs));
const dl = await readFile(join(HOME, "skills", "desc-less", "SKILL.md"), "utf8");
check("desc added", /^description:/m.test(dl));
check("flat renamed", (await readdir(join(HOME, "skills"))).includes("flat-bad.md"));
const fb = await readFile(join(HOME, "skills", "flat-bad.md"), "utf8");
check("flat name added", /^name: flat-bad$/m.test(fb));

// 4. 状态驱动：内容未变 → 全部跳过；修改一个文件 → 只重查它
const r2 = await auditSkills(HOME, log);
check("audit skips checked items", r2.checked.length === 0 && r2.skipped.length === 5 && r2.fixed.length === 0, JSON.stringify({ c: r2.checked.length, s: r2.skipped.length }));
await writeFile(join(HOME, "skills", "desc-less", "SKILL.md"), (await readFile(join(HOME, "skills", "desc-less", "SKILL.md"), "utf8")) + "<!-- touched -->\n");
const r3 = await auditSkills(HOME, log);
check("audit rechecks changed only", r3.checked.length === 1 && r3.checked[0].name === "desc-less" && r3.skipped.length === 4, JSON.stringify({ c: r3.checked.map((x) => x.name), s: r3.skipped.length }));

// 5. enable / disable / 冲突（good-skill 从池启用）
const en = await enableSkill(HOME, "good-skill", log);
check("enable ok", en.ok === true && (await readdir(join(HOME, "skills"))).includes("good-skill") && !(await readdir(join(HOME, "skill-pool"))).includes("good-skill"));
const en2 = await enableSkill(HOME, "good-skill", log);
check("dup enable conflict", en2.ok === false);
const de = await disableSkill(HOME, "good-skill", log);
check("disable ok", de.ok === true && (await readdir(join(HOME, "skill-pool"))).includes("good-skill") && !(await readdir(join(HOME, "skills"))).includes("good-skill"));
const de2 = await disableSkill(HOME, "good-skill", log);
check("dup disable conflict", de2.ok === false);

// 6. import（bundle 规整 / 平铺 / 重复冲突 / 来源缺失）
await mkdir(join(HOME, "src", "New_Imported"), { recursive: true });
await writeFile(join(HOME, "src", "New_Imported", "SKILL.md"), "---\nname: New_Imported\ndescription: imp\n---\nbody\n");
const im = await importSkill(HOME, join(HOME, "src", "New_Imported"), log);
check("import bundle kebab", im.ok === true && im.name === "new-imported" && (await readdir(join(HOME, "skill-pool"))).includes("new-imported"));
const im2 = await importSkill(HOME, join(HOME, "src", "New_Imported"), log);
check("import dup conflict", im2.ok === false);
await writeFile(join(HOME, "flat_src.md"), "---\nname: flat_src\n---\nbody\n");
const im3 = await importSkill(HOME, join(HOME, "flat_src.md"), log);
check("import flat", im3.ok === true && (await readdir(join(HOME, "skill-pool"))).includes("flat-src.md"));
const im4 = await importSkill(HOME, join(HOME, "nope.md"), log);
check("import missing source", im4.ok === false);

// 6b. import 目标选择：直接复制到启用目录 skills\
await mkdir(join(HOME, "src2", "Direct_Skill"), { recursive: true });
await writeFile(join(HOME, "src2", "Direct_Skill", "SKILL.md"), "---\nname: Direct_Skill\ndescription: direct\n---\nbody\n");
const im5 = await importSkill(HOME, join(HOME, "src2", "Direct_Skill"), log, { target: "skills" });
check("import to skills dir", im5.ok === true && im5.target === "skills" && (await readdir(join(HOME, "skills"))).includes("direct-skill"), JSON.stringify(im5));
const im6 = await importSkill(HOME, join(HOME, "src2", "Direct_Skill"), log, { target: "skills" });
check("import to skills dup conflict", im6.ok === false);

// 6c. 批量导入：集合目录（多 skill 子目录 + 顶层 .md；非 skill 文件忽略）
await mkdir(join(HOME, "srcset", "Alpha_Skill"), { recursive: true });
await writeFile(join(HOME, "srcset", "Alpha_Skill", "SKILL.md"), "---\nname: Alpha_Skill\ndescription: alpha\n---\nbody\n");
await mkdir(join(HOME, "srcset", "beta-skill"), { recursive: true });
await writeFile(join(HOME, "srcset", "beta-skill", "SKILL.md"), "---\nname: beta-skill\ndescription: beta\n---\nbody\n");
await writeFile(join(HOME, "srcset", "gamma_flat.md"), "---\nname: gamma_flat\ndescription: gamma\n---\nbody\n");
await writeFile(join(HOME, "srcset", "readme.txt"), "not a skill");
const bp = await importPath(HOME, join(HOME, "srcset"), log, { target: "pool" });
check("batch import all", bp.ok === true && bp.data.kind === "batch" && bp.data.imported.length === 3 && bp.data.failed.length === 0, JSON.stringify(bp));
const poolNames = await readdir(join(HOME, "skill-pool"));
check("batch names kebab", ["alpha-skill", "beta-skill", "gamma-flat.md"].every((n) => poolNames.includes(n)), poolNames.join(","));
const bp2 = await importPath(HOME, join(HOME, "srcset"), log, { target: "pool" });
check("batch conflicts to skipped", bp2.data.skipped.length === 3 && bp2.data.imported.length === 0 && bp2.data.failed.length === 0, JSON.stringify(bp2));
// 6d. 单个 skill 目录 → kind: single
const sp = await importPath(HOME, join(HOME, "src2", "Direct_Skill"), log, { target: "pool" });
check("single dir kind", sp.ok === true && sp.data.kind === "single" && sp.data.imported.length === 1 && sp.data.imported[0].name === "direct-skill", JSON.stringify(sp));
// 6e. 无 skill 的目录 → 报错
await mkdir(join(HOME, "empty"), { recursive: true });
const ep = await importPath(HOME, join(HOME, "empty"), log);
check("empty dir error", ep.ok === false);

// 6g. 重名冲突：预检 dryRun → conflicts；skip → skipped；overwrite → 覆盖替换
const dr = await importPath(HOME, join(HOME, "srcset"), log, { target: "pool", dryRun: true });
check("dryRun lists conflicts", dr.ok === true && dr.data.conflicts.length === 3 && dr.data.pending.length === 3 && dr.data.failed.length === 0, JSON.stringify(dr));
const skipR = await importPath(HOME, join(HOME, "srcset"), log, { target: "pool", conflict: "skip" });
check("conflict skip", skipR.data.skipped.length === 3 && skipR.data.imported.length === 0, JSON.stringify(skipR));
await writeFile(join(HOME, "srcset", "beta-skill", "SKILL.md"), "---\nname: beta-skill\ndescription: beta v2\n---\nbody v2\n");
const ow = await importPath(HOME, join(HOME, "srcset"), log, { target: "pool", conflict: "overwrite" });
check("conflict overwrite", ow.data.imported.length === 3 && ow.data.imported.every((x) => x.overwritten === true) && ow.data.skipped.length === 0, JSON.stringify(ow));
const beta = await readFile(join(HOME, "skill-pool", "beta-skill", "SKILL.md"), "utf8");
check("overwrite replaced content", beta.includes("body v2"), beta);
// 6f. 目录选择器 listDir
const ld = await listDir(HOME);
check("listDir home", ld.ok === true && ld.data.entries.some((e) => e.name === "skills" && e.isDir), JSON.stringify(ld.data && ld.data.entries && ld.data.entries.slice(0, 5)));
const ld2 = await listDir(join(HOME, "nope"));
check("listDir missing", ld2.ok === false);
// 6h. 盘符模式（此电脑）与尾斜杠容错
const drv = await listDir("");
check("listDir drives mode", drv.ok === true && drv.data.path === "__drives__" && drv.data.entries.length > 0 && drv.data.entries[0].isDir === true, JSON.stringify(drv));
const drv2 = await listDir("__drives__");
check("listDir __drives__ alias", drv2.ok === true && drv2.data.path === "__drives__");
const ts = await listDir(join(HOME, "skills") + "\\");
check("listDir trailing slash", ts.ok === true);
// 6i. 盘符根语义（Windows drive-relative 陷阱：裸盘符必须补 "\\"，否则解析为该盘当前目录）
const droot = await listDir("C:\\");
check("drive root keeps backslash", droot.ok === true && droot.data.path === "C:\\", JSON.stringify(droot));
const droot2 = await listDir("C:");
check("bare drive normalized to root", droot2.ok === true && droot2.data.path === "C:\\", JSON.stringify(droot2));
// 6j. 项目根判定（.git 祖先；无 .git 返回自身）
await mkdir(join(HOME, "proj"), { recursive: true });
const prSelf = findProjectRoot(join(HOME, "proj"));
check("findProjectRoot no git -> self", prSelf === join(HOME, "proj"), prSelf);
await mkdir(join(HOME, "proj", ".git"));
await mkdir(join(HOME, "proj", "sub", "deep"), { recursive: true });
check("findProjectRoot with git ancestor", findProjectRoot(join(HOME, "proj", "sub", "deep")) === join(HOME, "proj"));

// 7. state 快照（skills 6：my-bad-skill/bool-skill/desc-less/flat-bad.md/bom-skill/direct-skill；pool 7：good-skill/new-imported/flat-src.md/alpha-skill/beta-skill/gamma-flat.md/direct-skill）
const st = await state(HOME);
check("state shape", Array.isArray(st.enabled) && Array.isArray(st.pool) && st.enabled.length === 6 && st.pool.length === 7, JSON.stringify({ e: st.enabled.length, p: st.pool.length }));
check("state checked flags", st.enabled.filter((x) => x.name !== "direct-skill").every((x) => x.checked === true) && st.enabled.find((x) => x.name === "direct-skill").checked === false && st.pool.every((x) => x.checked === false), JSON.stringify({ e: st.enabled.map((x) => [x.name, x.checked]), p: st.pool.map((x) => [x.name, x.checked]) }));
check("state has descriptions", st.enabled.every((x) => typeof x.description === "string") && st.pool.every((x) => typeof x.description === "string"));
// 7b. 项目级 skill：构造项目根（.dsh/skills rank100 + .agents/skills rank200），state 带 projectRoots
await mkdir(join(HOME, "proj", ".dsh", "skills", "proj-skill"), { recursive: true });
await writeFile(join(HOME, "proj", ".dsh", "skills", "proj-skill", "SKILL.md"), "---\nname: proj-skill\ndescription: proj\n---\nbody\n");
await mkdir(join(HOME, "proj", ".agents", "skills", "agents-proj-skill"), { recursive: true });
await writeFile(join(HOME, "proj", ".agents", "skills", "agents-proj-skill", "SKILL.md"), "---\nname: agents-proj-skill\ndescription: ap\n---\nbody\n");
const st2 = await state(HOME, { projectRoots: [join(HOME, "proj")] });
check("state projects listed", st2.projects.length === 1 && st2.projects[0].items.length === 2, JSON.stringify(st2.projects));
check("project scope/rank/checked", st2.projects[0].items.find((x) => x.name === "proj-skill").scope === "project" && st2.projects[0].items.find((x) => x.name === "proj-skill").rank === 100 && st2.projects[0].items.find((x) => x.name === "agents-proj-skill").rank === 200 && st2.projects[0].items.every((x) => x.checked === false && typeof x.description === "string"), JSON.stringify(st2.projects[0].items));
// 7c. 当前项目（currentRoot）：默认只显示当前项目；与 projectRoots 去重
const st3 = await state(HOME, { projectRoots: [], currentRoot: join(HOME, "proj") });
check("state currentRoot marked", st3.projects.length === 1 && st3.projects[0].current === true && st3.projects[0].items.length === 2, JSON.stringify(st3.projects));
const st4 = await state(HOME, { projectRoots: [join(HOME, "proj")], currentRoot: join(HOME, "proj") });
check("currentRoot dedup vs projectRoots", st4.projects.length === 1 && st4.projects[0].current === true, JSON.stringify(st4.projects));

console.log("----  PASS=" + pass + " FAIL=" + fail + "  ----");
process.exit(fail ? 1 : 0);
