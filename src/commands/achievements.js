/**
 * Achievements — creator CRUD + the caller's earned badges and streak.
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function strFlag(args, name) {
  const v = getFlag(args, name);
  return (v && v !== true) ? v : null;
}

const FLAGS = ['title', 'd', 'description', 'icon', 'trigger', 'config', 'active'];
const USAGE = [
  'caas achievements                                  list mine (creator)',
  'caas achievements create --title "T" --trigger TYPE [-d DESC --icon 🏆 --config \'{"days":7}\']',
  'caas achievements update ID [--title … --active true|false]',
  'caas achievements rm ID',
  'caas achievements mine                             my earned badges + progress',
  'caas achievements streak                           my learning streak',
].join('\n  ');

function buildData(args) {
  const data = {};
  const title = strFlag(args, 'title'); if (title) data.title = title;
  const desc = strFlag(args, 'description') || strFlag(args, 'd'); if (desc) data.description = desc;
  const icon = strFlag(args, 'icon'); if (icon) data.iconEmoji = icon;
  const trigger = strFlag(args, 'trigger'); if (trigger) data.triggerType = trigger;
  const cfg = strFlag(args, 'config');
  if (cfg) { try { data.triggerConfig = JSON.parse(cfg); } catch { fmt.err('--config must be JSON'); process.exit(1); } }
  const active = strFlag(args, 'active'); if (active !== null) data.isActive = active === 'true';
  return data;
}

async function run(client, args, json) {
  validateFlags(args, FLAGS, USAGE);
  const pos = positionalArgs(args);
  const sub = pos[0];

  if (sub === 'create') {
    const data = buildData(args);
    if (!data.title || !data.triggerType) { fmt.err('Usage: caas achievements create --title "T" --trigger TYPE'); process.exit(1); }
    const result = await client.createAchievement(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const a = result.data || {};
    return fmt.ok(`Achievement created${a._id ? `: ${a._id}` : ''}`);
  }
  if (sub === 'update') {
    const id = pos[1];
    if (!id) { fmt.err('Usage: caas achievements update ID [flags]'); process.exit(1); }
    const result = await client.updateAchievement(id, buildData(args));
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Achievement updated');
  }
  if (sub === 'rm' || sub === 'delete') {
    const id = pos[1];
    if (!id) { fmt.err('Usage: caas achievements rm ID'); process.exit(1); }
    const result = await client.deleteAchievement(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Achievement deleted');
  }
  if (sub === 'mine') {
    const result = await client.myAchievements();
    if (json) return console.log(JSON.stringify(result, null, 2));
    const rows = (result.data && (result.data.achievements || result.data)) || [];
    if (!rows.length) return fmt.info('No achievements available.');
    fmt.heading('My Achievements');
    rows.forEach(r => {
      const a = r.achievement || r;
      const mark = r.earned ? `${fmt.C.green}✓${fmt.C.reset}` : `${fmt.C.gray}○${fmt.C.reset}`;
      const prog = (!r.earned && r.progress != null) ? ` ${fmt.C.gray}(${r.progress}%)${fmt.C.reset}` : '';
      console.log(`  ${mark} ${a.iconEmoji || '🏆'} ${a.title || ''}${prog}`);
    });
    return;
  }
  if (sub === 'streak') {
    const result = await client.myStreak();
    if (json) return console.log(JSON.stringify(result, null, 2));
    const d = result.data || {};
    fmt.ok(`Current streak: ${d.streak ?? 0} day${(d.streak === 1) ? '' : 's'}`);
    return;
  }

  // Default: creator list
  const result = await client.achievements();
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.achievements || result.data)) || [];
  if (!rows.length) return fmt.info('No achievements defined.');
  fmt.heading('Achievements');
  rows.forEach(a => {
    const id = fmt.pad(`${fmt.C.orange}${a._id}${fmt.C.reset}`, 40);
    const active = a.isActive ? `${fmt.C.green}active${fmt.C.reset}` : `${fmt.C.dim}off${fmt.C.reset}`;
    console.log(`  ${id} ${fmt.pad(`${fmt.C.cyan}${a.triggerType || '?'}${fmt.C.reset}`, 20)} ${fmt.pad(active, 12)} ${a.iconEmoji || '🏆'} ${a.title || ''}`);
  });
  console.log(fmt.count(rows.length, 'achievement'));
}

module.exports = { run };
