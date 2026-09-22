/**
 * Wishlist — the caller's saved courses.
 */
const fmt = require('../format');
const { positionalArgs, validateFlags } = require('../config');

async function run(client, args, json) {
  validateFlags(args, [], 'caas wishlist [add|rm COURSE_ID]');
  const pos = positionalArgs(args);
  const sub = pos[0];

  if (sub === 'add') {
    const courseId = pos[1];
    if (!courseId) { fmt.err('Usage: caas wishlist add COURSE_ID'); process.exit(1); }
    const result = await client.addWishlist(courseId);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Added to wishlist');
  }
  if (sub === 'rm' || sub === 'remove') {
    const courseId = pos[1];
    if (!courseId) { fmt.err('Usage: caas wishlist rm COURSE_ID'); process.exit(1); }
    const result = await client.removeWishlist(courseId);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Removed from wishlist');
  }

  const result = await client.wishlist();
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.items || result.data)) || [];
  if (!rows.length) return fmt.info('Wishlist is empty.');
  fmt.heading('Wishlist');
  rows.forEach(w => {
    const c = w.courseId || w.course || w;
    const cid = (c && (c._id || c.courseId)) || '';
    console.log(`  ${fmt.pad(`${fmt.C.orange}${cid}${fmt.C.reset}`, 40)} ${fmt.pad(fmt.price(c && c.pricing), 14)} ${(c && c.title) || ''}`);
  });
  console.log(fmt.count(rows.length, 'course'));
}

module.exports = { run };
