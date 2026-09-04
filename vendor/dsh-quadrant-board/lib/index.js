// dsh-quadrant-board — host half.
// 任务与知识看板（四象限任务 + 随手记 + 快捷区）。
// 后端为纯 Node.js 实现（原 Python server.py 的等价移植，零第三方依赖），
// 挂在 DSH webServer 的 /taskboard 前缀路由上；数据全部落地为纯文本文件：
//   <dataDir>/data/tasks.json   <dataDir>/data/shortcuts.json   <dataDir>/data/icons/
//   <dataDir>/notes/YYYY-Www.md <dataDir>/archive/YYYY-MM.md
import { join, resolve as resolvePath, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fsp from 'node:fs/promises';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import z from '@deepseek-ai/schemastery';

/** Cordis plugin name — must match the row name in cordis.patch.yml. */
export const name = 'dsh-quadrant-board';
/** Services required by this plugin. */
export const inject = ['webServer'];

export const Config = z.object({
    /** 数据根目录（含 data/ notes/ archive/ 子结构）。留空 = <DSH_HOME|cwd>/taskboard。 */
    dataDir: z.string().default(''),
    /** 单个请求体的字节上限。 */
    maxBodyBytes: z.number().default(4 * 1024 * 1024),
    /** 上传图标字节上限。 */
    maxIconBytes: z.number().default(1024 * 1024),
    /** 允许快捷区在本机打开目标（软件/文件夹/网页）。关闭后 /api/open 返回 403。 */
    openShortcuts: z.boolean().default(true),
});

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const STATIC_DIR = join(__dirname, '..', 'static');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.md': 'text/plain; charset=utf-8',
};
const IMG_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp'];

const QUAD_NAMES = {
    '1,1': 'Ⅰ 紧急且重要',
    '1,0': 'Ⅱ 重要不紧急',
    '0,1': 'Ⅲ 紧急不重要',
    '0,0': 'Ⅳ 不重要不紧急',
};
const ENTRY_RE = /^## (\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*$/;
const WEEK_RE = /^\d{4}-W\d{2}$/;
const ID_RE = /^[0-9a-f]{12}$/;

/* ---------- 时间与工具 ---------- */

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function nowStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
           `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function nowHM() { return nowStr().slice(0, 16); }
function newId() { return randomUUID().replace(/-/g, '').slice(0, 12); }
/** ISO 周（对齐 Python dt.isocalendar()，用本地日期）。 */
function weekName(d = new Date()) {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (t.getDay() || 7);
    t.setDate(t.getDate() + 4 - day);
    const y = t.getFullYear();
    const yearStart = new Date(y, 0, 1);
    const w = Math.ceil((((t - yearStart) / 864e5) + 1) / 7);
    return `${y}-W${pad(w)}`;
}

/* ---------- 数据存取 ---------- */

function makeStore(dataDir) {
    const DATA_DIR = join(dataDir, 'data');
    const ICONS_DIR = join(DATA_DIR, 'icons');
    const NOTES_DIR = join(dataDir, 'notes');
    const ARCHIVE_DIR = join(dataDir, 'archive');
    const TASKS_JSON = join(DATA_DIR, 'tasks.json');
    const SHORTCUTS_JSON = join(DATA_DIR, 'shortcuts.json');
    for (const d of [DATA_DIR, ICONS_DIR, NOTES_DIR, ARCHIVE_DIR]) fs.mkdirSync(d, { recursive: true });

    let chain = Promise.resolve();
    /** 全部写操作串行化（对齐 server.py 的 threading.Lock 语义）。 */
    function locked(fn) {
        chain = chain.then(fn).catch((err) => { console.error('[dsh-quadrant-board]', err); });
        return chain;
    }

    async function loadJson(path, fallback) {
        try { return JSON.parse(await fsp.readFile(path, 'utf8')); }
        catch { return fallback; }
    }
    async function saveJson(path, obj) {
        const tmp = path + '.tmp';
        await fsp.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
        await fsp.rename(tmp, path);
    }
    function cleanTags(v) {
        if (typeof v === 'string') v = v.split(/[,，]/);
        if (!Array.isArray(v)) return [];
        const out = [];
        for (const raw of v) {
            const t = String(raw).trim();
            if (t && !out.includes(t)) out.push(t);
        }
        return out.slice(0, 12);
    }

    /* ---- 随手记（周 markdown 文件） ---- */

    async function parseNotes(path) {
        let text;
        try { text = await fsp.readFile(path, 'utf8'); } catch { return []; }
        const entries = [];
        let cur = null;
        for (const line of text.split('\n')) {
            const m = ENTRY_RE.exec(line.replace(/\r$/, ''));
            if (m) {
                if (cur) entries.push(cur);
                cur = { idx: entries.length, time: m[1], content: '' };
            } else if (cur) {
                cur.content += line + '\n';
            }
        }
        if (cur) entries.push(cur);
        for (const e of entries) e.content = e.content.replace(/\n+$/, '');
        entries.reverse(); // 新的在前
        return entries;
    }
    async function readWeekOrdered(week) {
        const entries = await parseNotes(join(NOTES_DIR, week + '.md'));
        entries.reverse(); // 旧→新，idx 与文件原始序号一致
        return entries;
    }
    async function writeWeek(week, entries) {
        const path = join(NOTES_DIR, week + '.md');
        const tmp = path + '.tmp';
        let out = `# 随手记 ${week}\n\n`;
        for (const e of entries) out += `## ${e.time}\n${e.content.replace(/\n+$/, '')}\n\n`;
        await fsp.writeFile(tmp, out, 'utf8');
        await fsp.rename(tmp, path);
    }
    async function appendNote(content) {
        const name = weekName();
        const path = join(NOTES_DIR, name + '.md');
        try { await fsp.access(path); } catch {
            await fsp.writeFile(path, `# 随手记 ${name}\n\n`, 'utf8');
        }
        await fsp.appendFile(path, `## ${nowHM()}\n${content.trim()}\n\n`, 'utf8');
        return name;
    }
    async function listWeeks() {
        const names = [];
        for (const fn of await fsp.readdir(NOTES_DIR)) {
            if (fn.endsWith('.md') && WEEK_RE.test(fn.slice(0, -3))) names.push(fn.slice(0, -3));
        }
        names.sort().reverse();
        return names;
    }

    /* ---- 完成归档 ---- */

    async function archiveDoneTask(t) {
        const d = new Date();
        const name = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        const path = join(ARCHIVE_DIR, name + '.md');
        try { await fsp.access(path); } catch {
            await fsp.writeFile(path, `# 已完成任务 ${name}\n\n`, 'utf8');
        }
        const title = String(t.title || '').replace(/\n/g, ' ').trim();
        const lines = [`## ${nowHM()} · ${title}`];
        lines.push(`- 象限：${QUAD_NAMES[`${t.important ? 1 : 0},${t.urgent ? 1 : 0}`]}`);
        if (t.tags && t.tags.length) lines.push(`- 标签：${t.tags.join('、')}`);
        if (t.deadline) lines.push(`- 截止：${t.deadline}`);
        if (t.created) lines.push(`- 创建：${t.created}`);
        let out = '\n' + lines.join('\n') + '\n';
        const note = String(t.note || '').trim();
        if (note) out += '> ' + note.replace(/\n/g, '\n> ') + '\n';
        out += '\n';
        await fsp.appendFile(path, out, 'utf8');
    }

    async function buildState() {
        const tasks = await loadJson(TASKS_JSON, []);
        const shortcuts = await loadJson(SHORTCUTS_JSON, []);
        const weeks = await listWeeks();
        const cur = weekName();
        const sel = weeks.includes(cur) ? cur : (weeks[0] || cur);
        const entries = await parseNotes(join(NOTES_DIR, sel + '.md'));
        return { tasks, shortcuts, weeks, notes: { week: sel, entries }, server_time: nowStr() };
    }

    /* ---- 本机打开（替代 Python os.startfile / webbrowser.open） ---- */

    function openTarget(target) {
        if (process.platform === 'win32') {
            // rundll32 FileProtocolHandler 统一处理 exe / 文件夹 / URL，无 shell 引号歧义。
            const child = spawn('rundll32', ['url.dll,FileProtocolHandler', target],
                { detached: true, stdio: 'ignore' });
            child.on('error', () => {});
            child.unref();
            return;
        }
        const bin = process.platform === 'darwin' ? 'open' : 'xdg-open';
        const child = spawn(bin, [target], { detached: true, stdio: 'ignore' });
        child.on('error', () => {});
        child.unref();
    }

    return {
        dataDir, ICONS_DIR, STATIC_DIR,
        locked,
        loadJson, saveJson, cleanTags, buildState, parseNotes,
        TASKS_JSON, SHORTCUTS_JSON, NOTES_DIR,
        appendNote, readWeekOrdered, writeWeek, listWeeks, archiveDoneTask, openTarget,
    };
}

/* ---------- HTTP 帮助函数 ---------- */

function sendJson(res, obj, code = 200) {
    const body = Buffer.from(JSON.stringify(obj), 'utf8');
    res.writeHead(code, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
    });
    res.end(body);
}
function err(res, code, msg) { sendJson(res, { ok: false, error: msg }, code); }

function readBody(req, maxBytes) {
    return new Promise((resolveRead) => {
        const len = parseInt(req.headers['content-length'] || '0', 10);
        if (!Number.isFinite(len) || len <= 0) { resolveRead({}); return; }
        const capped = Math.min(len, maxBytes);
        const chunks = [];
        let size = 0;
        req.on('data', (c) => {
            size += c.length;
            if (size > maxBytes) { resolveRead(null); req.destroy(); return; }
            chunks.push(c);
        });
        req.on('end', () => {
            try { resolveRead(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
            catch { resolveRead(null); }
        });
        req.on('error', () => resolveRead(null));
    });
}

function safeJoin(base, rel) {
    const p = resolvePath(base, rel);
    if (p !== base && !p.startsWith(base + sep)) return null;
    return p;
}

async function serveFile(res, path, cache = false) {
    let data;
    try { data = await fsp.readFile(path); } catch { return err(res, 404, 'not found'); }
    const ctype = MIME[extname(path).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
        'Content-Type': ctype,
        'Content-Length': data.length,
        'Cache-Control': cache ? 'max-age=86400' : 'no-store',
    });
    res.end(data);
}

function hostAllowed(req) {
    const h = String(req.headers.host || '').toLowerCase();
    if (!h) return true;
    return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(h);
}

/* ---------- 插件入口 ---------- */

export function apply(ctx, config) {
    const dataDir = config.dataDir
        ? resolvePath(config.dataDir)
        : join(process.env.DSH_HOME || process.cwd(), 'taskboard');
    const store = makeStore(dataDir);

    ctx.effect(() => ctx.webServer.register({
        kind: 'prefix',
        path: '/taskboard',
        handler: async (req, res) => {
            try {
                if (!hostAllowed(req)) return err(res, 403, 'forbidden');
                const u = new URL(req.url, 'http://localhost');
                const path = decodeURIComponent(u.pathname);
                const method = req.method || 'GET';

                /* ---- 静态资源 ---- */
                if (method === 'GET') {
                    if (path === '/taskboard' || path === '/taskboard/' || path === '/taskboard/index.html') {
                        return serveFile(res, join(STATIC_DIR, 'index.html'));
                    }
                    if (path.startsWith('/taskboard/static/')) {
                        const p = safeJoin(STATIC_DIR, path.slice('/taskboard/static/'.length));
                        return p ? serveFile(res, p) : err(res, 403, 'forbidden');
                    }
                    if (path.startsWith('/taskboard/icons/')) {
                        const p = safeJoin(store.ICONS_DIR, path.slice('/taskboard/icons/'.length));
                        return p ? serveFile(res, p, true) : err(res, 403, 'forbidden');
                    }
                }

                /* ---- API ---- */
                if (!path.startsWith('/taskboard/api/')) return err(res, 404, 'unknown api');

                if (method === 'GET' && path === '/taskboard/api/state') {
                    return sendJson(res, { ok: true, state: await store.buildState() });
                }
                if (method === 'GET' && path === '/taskboard/api/notes') {
                    const wk = u.searchParams.get('week') || '';
                    if (!WEEK_RE.test(wk)) return err(res, 400, 'bad week');
                    const entries = await store.parseNotes
                        ? await store.parseNotes(join(store.NOTES_DIR, wk + '.md'))
                        : [];
                    return sendJson(res, { ok: true, week: wk, entries });
                }

                const body = method === 'GET' ? {} : await readBody(req, config.maxBodyBytes);
                if (body === null) return err(res, 400, '请求数据格式错误（需为合法 JSON）');

                /* ---- POST ---- */
                if (method === 'POST' && path === '/taskboard/api/tasks') {
                    const title = String(body.title || '').trim();
                    if (!title) return err(res, 400, '标题不能为空');
                    const task = {
                        id: newId(),
                        title,
                        deadline: String(body.deadline || '').trim(),
                        done: false,
                        note: String(body.note || '').trim(),
                        tags: store.cleanTags(body.tags),
                        important: !!body.important,
                        urgent: !!body.urgent,
                        created: nowStr(),
                        completed_at: '',
                    };
                    await store.locked(async () => {
                        const tasks = await store.loadJson(store.TASKS_JSON, []);
                        tasks.push(task);
                        await store.saveJson(store.TASKS_JSON, tasks);
                    });
                    return sendJson(res, { ok: true, task });
                }
                if (method === 'POST' && path === '/taskboard/api/notes') {
                    const content = String(body.content || '').trim();
                    if (!content) return err(res, 400, '内容不能为空');
                    const wk = await store.appendNote(content);
                    return sendJson(res, { ok: true, week: wk });
                }
                if (method === 'POST' && path === '/taskboard/api/shortcuts') {
                    const name = String(body.name || '').trim();
                    const target = String(body.target || '').trim();
                    if (!name || !target) return err(res, 400, '名称和目标不能为空');
                    const sc = {
                        id: newId(),
                        name,
                        target,
                        kind: ['app', 'folder', 'url'].includes(body.kind) ? body.kind : 'app',
                        icon: String(body.icon || 'builtin:app').trim(),
                    };
                    await store.locked(async () => {
                        const scs = await store.loadJson(store.SHORTCUTS_JSON, []);
                        scs.push(sc);
                        await store.saveJson(store.SHORTCUTS_JSON, scs);
                    });
                    return sendJson(res, { ok: true, shortcut: sc });
                }
                if (method === 'POST' && path === '/taskboard/api/icons') {
                    const base = String(body.name || '').split(/[\\/]/).pop() || '';
                    const ext = extname(base).toLowerCase();
                    if (!IMG_EXTS.includes(ext)) return err(res, 400, '仅支持 png/jpg/gif/ico/svg/webp');
                    let data = String(body.data || '');
                    const comma = data.indexOf(',');
                    if (comma >= 0 && comma < 64) data = data.slice(comma + 1);
                    let blob;
                    try { blob = Buffer.from(data, 'base64'); } catch { return err(res, 400, '图片数据无效'); }
                    if (!blob.length || blob.length > config.maxIconBytes) return err(res, 400, '图片过大（≤1MB）');
                    const fname = newId() + ext;
                    await fsp.writeFile(join(store.ICONS_DIR, fname), blob);
                    return sendJson(res, { ok: true, icon: 'custom:' + fname });
                }
                if (method === 'POST' && path === '/taskboard/api/open') {
                    if (!config.openShortcuts) return err(res, 403, '本机打开已被配置禁用');
                    const scs = await store.loadJson(store.SHORTCUTS_JSON, []);
                    const sc = scs.find((s) => s && s.id === body.id);
                    if (!sc) return err(res, 404, '快捷方式不存在');
                    try { store.openTarget(String(sc.target || '')); }
                    catch (e) { return err(res, 500, '打开失败: ' + (e && e.message)); }
                    return sendJson(res, { ok: true });
                }

                /* ---- PUT ---- */
                if (method === 'PUT' && path === '/taskboard/api/notes') {
                    const week = String(body.week || '');
                    if (!WEEK_RE.test(week)) return err(res, 400, 'bad week');
                    const content = String(body.content || '').trim();
                    if (!content) return err(res, 400, '内容不能为空');
                    let result = null;
                    await store.locked(async () => {
                        const entries = await store.readWeekOrdered(week);
                        const idx = body.idx;
                        if (!Number.isInteger(idx) || idx < 0 || idx >= entries.length) {
                            result = { code: 404, msg: '记录不存在' };
                            return;
                        }
                        entries[idx].content = content;
                        await store.writeWeek(week, entries);
                    });
                    if (result) return err(res, result.code, result.msg);
                    return sendJson(res, { ok: true });
                }
                {
                    const m = /^\/taskboard\/api\/tasks\/([0-9a-f]{12})$/.exec(path);
                    if (method === 'PUT' && m) {
                        let out = null;
                        await store.locked(async () => {
                            const tasks = await store.loadJson(store.TASKS_JSON, []);
                            const t = tasks.find((x) => x && x.id === m[1]);
                            if (!t) { out = { code: 404, msg: '任务不存在' }; return; }
                            const wasDone = !!t.done;
                            for (const k of ['title', 'deadline', 'note']) {
                                if (k in body && body[k] !== null && body[k] !== undefined) t[k] = String(body[k]).trim();
                            }
                            for (const k of ['done', 'important', 'urgent']) {
                                if (k in body) t[k] = !!body[k];
                            }
                            if ('tags' in body) t.tags = store.cleanTags(body.tags);
                            if (t.done && !wasDone) { t.completed_at = nowStr(); await store.archiveDoneTask(t); }
                            if (!t.done) t.completed_at = '';
                            await store.saveJson(store.TASKS_JSON, tasks);
                            out = { task: t };
                        });
                        if (out && out.code) return err(res, out.code, out.msg);
                        return sendJson(res, { ok: true, task: out.task });
                    }
                    const ms = /^\/taskboard\/api\/shortcuts\/([0-9a-f]{12})$/.exec(path);
                    if (method === 'PUT' && ms) {
                        let out = null;
                        await store.locked(async () => {
                            const scs = await store.loadJson(store.SHORTCUTS_JSON, []);
                            const s = scs.find((x) => x && x.id === ms[1]);
                            if (!s) { out = { code: 404, msg: '快捷方式不存在' }; return; }
                            for (const k of ['name', 'target', 'icon']) {
                                if (k in body && body[k] !== null && body[k] !== undefined) s[k] = String(body[k]).trim();
                            }
                            if (['app', 'folder', 'url'].includes(body.kind)) s.kind = body.kind;
                            await store.saveJson(store.SHORTCUTS_JSON, scs);
                            out = { shortcut: s };
                        });
                        if (out && out.code) return err(res, out.code, out.msg);
                        return sendJson(res, { ok: true, shortcut: out.shortcut });
                    }
                }

                /* ---- DELETE ---- */
                if (method === 'DELETE' && path === '/taskboard/api/notes') {
                    const week = String(body.week || '');
                    if (!WEEK_RE.test(week)) return err(res, 400, 'bad week');
                    let result = null;
                    await store.locked(async () => {
                        const entries = await store.readWeekOrdered(week);
                        const idx = body.idx;
                        if (!Number.isInteger(idx) || idx < 0 || idx >= entries.length) {
                            result = { code: 404, msg: '记录不存在' };
                            return;
                        }
                        entries.splice(idx, 1);
                        await store.writeWeek(week, entries);
                    });
                    if (result) return err(res, result.code, result.msg);
                    return sendJson(res, { ok: true });
                }
                {
                    const m = /^\/taskboard\/api\/tasks\/([0-9a-f]{12})$/.exec(path);
                    if (method === 'DELETE' && m) {
                        let result = null;
                        await store.locked(async () => {
                            const tasks = await store.loadJson(store.TASKS_JSON, []);
                            const next = tasks.filter((x) => x && x.id !== m[1]);
                            if (next.length === tasks.length) { result = { code: 404, msg: '任务不存在' }; return; }
                            await store.saveJson(store.TASKS_JSON, next);
                        });
                        if (result) return err(res, result.code, result.msg);
                        return sendJson(res, { ok: true });
                    }
                    const ms = /^\/taskboard\/api\/shortcuts\/([0-9a-f]{12})$/.exec(path);
                    if (method === 'DELETE' && ms) {
                        let result = null;
                        await store.locked(async () => {
                            const scs = await store.loadJson(store.SHORTCUTS_JSON, []);
                            const next = scs.filter((x) => x && x.id !== ms[1]);
                            if (next.length === scs.length) { result = { code: 404, msg: '快捷方式不存在' }; return; }
                            await store.saveJson(store.SHORTCUTS_JSON, next);
                        });
                        if (result) return err(res, result.code, result.msg);
                        return sendJson(res, { ok: true });
                    }
                }

                return err(res, 404, 'unknown api');
            } catch (e) {
                console.error('[dsh-quadrant-board] handler error', e);
                try { err(res, 500, 'internal error'); } catch { /* socket gone */ }
            }
        },
    }));

    console.log(`[dsh-quadrant-board] data dir: ${dataDir}`);
}
