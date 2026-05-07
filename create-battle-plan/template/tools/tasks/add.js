#!/usr/bin/env node
// tools/tasks/add.js — CLI to append a task to tasks.yml.
// Usage: node tools/tasks/add.js "title" [--due YYYY-MM-DD] [--tag X] [--priority 1|2|3]
//                                         [--lane LANE] [--implication PATH] [--blocked-by N]
//                                         [--context "..."] [--snooze YYYY-MM-DD]
//   --blocked-by: TASK-ID (number) that must close first. Repeatable; comma-separated also accepted.

const tasks = require('./lib/tasks');

function parseArgs(argv) {
  const args = {
    title: null, due: null, tags: [], priority: 2,
    lane: 'meta', implications: [], blockedBy: [],
    context: null, snooze: null
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--due') args.due = argv[++i];
    else if (a === '--tag') args.tags.push(argv[++i]);
    else if (a === '--priority') args.priority = parseInt(argv[++i], 10);
    else if (a === '--lane') args.lane = argv[++i];
    else if (a === '--implication') args.implications.push(argv[++i]);
    else if (a === '--blocked-by') {
      const v = argv[++i];
      for (const part of String(v).split(',')) {
        const n = parseInt(part.trim(), 10);
        if (!isNaN(n)) args.blockedBy.push(n);
      }
    }
    else if (a === '--context') args.context = argv[++i];
    else if (a === '--snooze') args.snooze = argv[++i];
    else positional.push(a);
  }
  args.title = positional.join(' ');
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.title) {
  console.error('Usage: node tools/tasks/add.js "title" [--due YYYY-MM-DD] [--tag X] [--priority 1|2|3] [--lane LANE] [--implication PATH] [--blocked-by N] [--context "..."] [--snooze YYYY-MM-DD]');
  process.exit(1);
}
if (!tasks.VALID_PRIORITY.has(args.priority)) {
  console.error(`Invalid priority ${args.priority} — must be 1, 2, or 3.`);
  process.exit(1);
}
if (!tasks.VALID_LANES.has(args.lane)) {
  console.error(`Invalid lane "${args.lane}" — must be one of: ${[...tasks.VALID_LANES].join(', ')}.`);
  process.exit(1);
}
if (args.due && !/^\d{4}-\d{2}-\d{2}$/.test(args.due)) {
  console.error(`Invalid --due ${args.due} — must be YYYY-MM-DD.`);
  process.exit(1);
}

const state = tasks.load();
const id = tasks.nextId(state);
const task = {
  id,
  created: tasks.today(),
  due: args.due || null,
  status: args.snooze ? 'snoozed' : 'open',
  priority: args.priority,
  lane: args.lane,
  tags: args.tags,
  title: args.title,
  context: args.context || null,
  done_at: null,
  snoozed_until: args.snooze || null
};
if (args.implications.length) task.implications = args.implications;
if (args.blockedBy.length) {
  const knownIds = new Set(state.tasks.map(t => t.id));
  const unknown = args.blockedBy.filter(n => !knownIds.has(n));
  if (unknown.length) {
    console.error(`Invalid --blocked-by: TASK-${unknown.join(', TASK-')} not found in tasks.yml.`);
    process.exit(1);
  }
  task.blocked_by = args.blockedBy;
}
state.tasks.push(task);
tasks.save(state);

const flagSummary = [
  `priority ${args.priority}`,
  `lane ${args.lane}`,
  args.due && `due ${args.due}`,
  args.tags.length && `tags ${args.tags.join(',')}`,
  args.implications.length && `implications ${args.implications.join(',')}`,
  args.blockedBy.length && `blocked-by TASK-${args.blockedBy.join(' TASK-')}`
].filter(Boolean).join(', ');
console.log(`✓ Added TASK-${id} (${flagSummary})`);
console.log(`  ${args.title}`);
console.log('');
console.log('Run `node tools/tasks/render-today.js` to regenerate docs/today.md.');
