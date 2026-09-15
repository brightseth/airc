// Direct-library leg for a public-url door. Deterministic, no model. Asserts network silence and opener behavior.
import { readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
const S = process.env.S, WT = `${S}/nbhd2/prototypes/shared-context-browser`, WORLD = process.argv[2] || 'leo-latent-resonator';
const HOME = `${S}/home3`; process.env.HOME = HOME; process.env.OPEN_LOG = `${S}/check/open.log`;
// any network read anywhere in-process is a failure
let fetches = 0; globalThis.fetch = async (...a) => { fetches += 1; throw new Error('NETWORK ATTEMPTED: ' + String(a[0])); };
// module namespaces are frozen; guard at the socket layer instead — every in-process TCP client goes through here
const net = await import('node:net'); const _connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function () { fetches += 1; throw new Error('NETWORK ATTEMPTED (socket)'); };
// and statically: the library imports no network module at all
const libSrc = readFileSync(`${WT}/neighborhood.mjs`, 'utf8');
const netImports = (libSrc.match(/from '(node:)?(http|https|net|tls|dns|undici)'/g) || []);
const N = await import(`${WT}/neighborhood.mjs`);
const door = N.doorByWorld(WORLD); const R = []; const ok = (n, p, e) => { R.push({ n, p, e }); console.log(`${p ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); };
const opens = () => existsSync(process.env.OPEN_LOG) ? readFileSync(process.env.OPEN_LOG, 'utf8').split('\n').filter(Boolean) : [];
rmSync(process.env.OPEN_LOG, { force: true }); rmSync(`${HOME}/.vibe`, { recursive: true, force: true });

ok('library imports no network module (static)', netImports.length === 0, `imports: ${(libSrc.match(/from '[^']+'/g)||[]).join(' ')}`);
ok('door is a real-person public-url door (no fixture flag)', door && door.enter.kind === 'public-url' && !door.fixture && door.made_by === 'leolambertini', `${door.made_by} · ${door.enter.ref}`);
ok('access.may_not includes run_anything', door.access.may_not.includes('run_anything'), door.access.may_not.join(','));
const notes = N.notes(door); ok('notes read as text, inside the folder', notes.length === 1 && typeof notes[0].text === 'string' && !notes[0].refused, `${notes[0].file}: ${notes[0].text.length} chars (content withheld)`);

// run A: VIBE_NO_OPEN=1 — nothing at all happens on enter
process.env.VIBE_NO_OPEN = '1';
let { world } = await N.enter(door); let st = world.arrive().state;
ok('A: with VIBE_NO_OPEN, opener never invoked', opens().length === 0 && st.opened === 0, `open.log lines=${opens().length}`);
st = world.act('note', 'the page is a project someone is actually building, not a description of one', st).state;
const thing = world.takeHome(st); const r1 = N.bringHome(door, thing); const r2 = N.bringHome(door, thing);
const rec = N.broughtHome()[0]; const txt = JSON.stringify(rec);
ok('A: observation taken home, kind=observation', r1.appended && rec.kind === 'observation' && rec.content === thing.content, rec.content.slice(0, 60));
ok('A: origin byte-equal to the door + made_by + door', rec.origin.world === door.origin.world && rec.origin.revision === door.origin.revision && rec.origin.published === door.origin.published && rec.origin.made_by === door.made_by && rec.origin.door === door.slug && rec.origin.entered_via === door.enter.ref, JSON.stringify(rec.origin));
ok('A: id recomputed; identical second bringHome appended nothing', rec.id === N.homeId(door.slug, door.origin.revision, thing.content) && r2.appended === false && N.broughtHome().length === 1, rec.id);
ok('A: record carries no cwd / absolute path', !('cwd' in rec) && !/\/(Users|private|home|tmp)\//.test(txt), Object.keys(rec).join(','));
ok('A: resume reproduces the observation from the record alone', world.resume(rec.replay).observations.join(' / ') === thing.content, '');
ok('A: zero network attempts in-process (fetch stub + socket guard)', fetches === 0, `attempts=${fetches}`);

// run B: VIBE_NO_OPEN unset — only the OS opener, with the literal URL, once on arrive
delete process.env.VIBE_NO_OPEN; rmSync(process.env.OPEN_LOG, { force: true });
({ world } = await N.enter(door)); st = world.arrive().state;
const o = opens();
ok('B: without VIBE_NO_OPEN, opener invoked exactly once on arrive', o.length === 1 && st.opened === 1, `open.log: ${o.join(' | ')}`);
ok('B: opener received the literal ref and nothing else', o[0] === `open ${door.enter.ref}`, '');
ok('B: still zero network attempts (opened, never fetched)', fetches === 0, `attempts=${fetches}`);
st = world.act('open', '', st).state; ok('B: explicit "open" action invokes the opener again, still no fetch', opens().length === 2 && fetches === 0, '');
writeFileSync(`${S}/check/results-url-${WORLD}.json`, JSON.stringify({ sha: 'cdb3569e', world: WORLD, results: R }, null, 1));
console.log(`\nurl-leg ${WORLD}: ${R.filter((x) => x.p).length}/${R.length}`); process.exit(R.every((x) => x.p) ? 0 : 1);
