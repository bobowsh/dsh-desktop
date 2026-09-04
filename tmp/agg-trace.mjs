// Trace AggregateError internals so swallowed sub-errors become visible.
const Orig = globalThis.AggregateError;
const seen = [];
globalThis.AggregateError = class TracedAggregateError extends Orig {
  constructor(errors, message, options) {
    super(errors, message, options);
    seen.push(this);
  }
};

let dumped = false;
function dump() {
  if (dumped) return;
  dumped = true;
  for (const agg of seen) {
    const errs = Array.from(agg.errors || []);
    process.stderr.write(`\n===== AGGREGATE DETAIL (${errs.length} sub-errors) :: ${agg.message} =====\n`);
    errs.forEach((e, i) => {
      process.stderr.write(`\n--- sub-error #${i} ---\n${(e && e.stack) || String(e)}\n`);
    });
    process.stderr.write(`===== END AGGREGATE =====\n`);
  }
}
process.on('exit', dump);
process.on('uncaughtException', (e) => { dump(); process.stderr.write('uncaught: ' + ((e && e.stack) || e) + '\n'); });
