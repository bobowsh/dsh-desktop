/** Shared, demand-driven state for the AgentTeams browser monitor. */
const targets = new Map();
const targetListeners = new Set();
const snapshotListeners = new Set();
let targetSnapshot = [];
let activitySnapshots = { teams: [], archivedTeams: [] };
function targetKey(sessionId, teamId) {
    return `${sessionId}\u0000${teamId}`;
}
function publishTargets() {
    targetSnapshot = [...targets.values()]
        .filter((target) => target.active)
        .map(({ key, sessionId, teamId }) => ({ key, sessionId, teamId }));
    for (const listener of targetListeners)
        listener();
}
/** Subscribe to the active monitor-target list (React external-store shape). */
export function subscribeActivityMonitorTargets(listener) {
    targetListeners.add(listener);
    return () => { targetListeners.delete(listener); };
}
/** Read the stable active-target snapshot. */
export function getActivityMonitorTargetsSnapshot() {
    return targetSnapshot;
}
/**
 * Register one successful AgentTeams card as a monitoring demand.
 *
 * The returned cleanup is reference-counted so multiple cards and React
 * StrictMode remounts cannot stop another card's monitor.
 */
export function monitorAgentTeam(sessionId, teamId) {
    const owner = sessionId.trim();
    const id = teamId.trim();
    if (owner === '' || id === '')
        return () => { };
    const key = targetKey(owner, id);
    const existing = targets.get(key);
    if (existing === undefined) {
        targets.set(key, { key, sessionId: owner, teamId: id, refs: 1, active: true });
        publishTargets();
    }
    else {
        existing.refs += 1;
        if (!existing.active) {
            existing.active = true;
            publishTargets();
        }
    }
    let released = false;
    return () => {
        if (released)
            return;
        released = true;
        const current = targets.get(key);
        if (current === undefined)
            return;
        current.refs -= 1;
        if (current.refs <= 0) {
            targets.delete(key);
            if (current.active)
                publishTargets();
        }
    };
}
/** Stop polling targets whose final archived snapshot has been captured. */
export function settleActivityMonitorTargets(keys) {
    let changed = false;
    for (const key of keys) {
        const target = targets.get(key);
        if (target?.active !== true)
            continue;
        target.active = false;
        changed = true;
    }
    if (changed)
        publishTargets();
}
/** Subscribe to the shared live/archive snapshot. */
export function subscribeActivitySnapshots(listener) {
    snapshotListeners.add(listener);
    return () => { snapshotListeners.delete(listener); };
}
/** Read the stable shared live/archive snapshot. */
export function getActivitySnapshotsSnapshot() {
    return activitySnapshots;
}
/** Publish one or both successful state-route responses. */
export function updateActivitySnapshots(update) {
    const next = {
        teams: update.teams ?? activitySnapshots.teams,
        archivedTeams: update.archivedTeams ?? activitySnapshots.archivedTeams,
    };
    if (next.teams === activitySnapshots.teams && next.archivedTeams === activitySnapshots.archivedTeams)
        return;
    activitySnapshots = next;
    for (const listener of snapshotListeners)
        listener();
}
/** Poll cadence for the live host snapshot route. */
export const ACTIVITY_POLL_MS = 1000;
/** Host route serving live and archived team snapshots. */
export const ACTIVITY_STATE_URL = '/plugins/dsh-agent-teams/state';
/**
 * Start the single polling loop for the current session's requested targets.
 *
 * With no targets this is deliberately inert: installing the plugin must not
 * touch the state route. Live state is polled at the normal cadence; archive
 * state is fetched only as a one-time fallback for targets no longer live.
 */
export function startActivityPolling(monitorTargets, runtime = {}) {
    if (monitorTargets.length === 0) {
        return { firstTick: Promise.resolve(), stop: () => { } };
    }
    const fetchState = runtime.fetchState ?? ((url, init) => fetch(url, init));
    const schedule = runtime.schedule ?? ((callback, intervalMs) => setInterval(callback, intervalMs));
    const cancel = runtime.cancel ?? ((timer) => { clearInterval(timer); });
    const publishSnapshots = runtime.publishSnapshots ?? updateActivitySnapshots;
    const settleTargets = runtime.settleTargets ?? settleActivityMonitorTargets;
    let cancelled = false;
    let inFlight = false;
    let controller;
    const tick = async () => {
        if (inFlight || cancelled)
            return;
        inFlight = true;
        controller = new AbortController();
        try {
            const liveResponse = await fetchState(ACTIVITY_STATE_URL, {
                cache: 'no-store',
                signal: controller.signal,
            });
            if (!liveResponse.ok)
                return;
            const body = (await liveResponse.json());
            if (cancelled || !Array.isArray(body.teams))
                return;
            const liveTeams = body.teams;
            publishSnapshots({ teams: liveTeams });
            const missing = monitorTargets.filter((target) => !liveTeams.some((team) => team.captainSessionId === target.sessionId && team.teamId === target.teamId));
            if (missing.length === 0)
                return;
            // Archives are immutable. A successful fallback retires every missing
            // target, including legacy cards whose host archive no longer exists.
            const archivedResponse = await fetchState(`${ACTIVITY_STATE_URL}?archived=1`, {
                cache: 'no-store',
                signal: controller.signal,
            });
            if (!archivedResponse.ok)
                return;
            const archivedBody = (await archivedResponse.json());
            if (cancelled || !Array.isArray(archivedBody.teams))
                return;
            publishSnapshots({ archivedTeams: archivedBody.teams });
            settleTargets(new Set(missing.map((target) => target.key)));
        }
        catch (error) {
            if (error?.name === 'AbortError')
                return;
            // Host restarting; keep the last snapshot and retry on the next tick.
        }
        finally {
            inFlight = false;
        }
    };
    const firstTick = tick();
    const timer = schedule(() => { void tick(); }, ACTIVITY_POLL_MS);
    return {
        firstTick,
        stop: () => {
            if (cancelled)
                return;
            cancelled = true;
            controller?.abort();
            cancel(timer);
        },
    };
}
