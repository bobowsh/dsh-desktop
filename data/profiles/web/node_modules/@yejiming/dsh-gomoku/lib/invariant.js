//#region src/invariant.ts
const PACKAGE_NAME = "@yejiming/dsh-gomoku";
/** Cordis companion plugin name. */
const name = "gomoku-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: the gomoku plugin owns no cross-plugin mutable
* state and emits no cordis events — the board routes validate every
* untrusted input at the HTTP boundary, and behavior is asserted by this
* package's route/reply tests.
*/
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
