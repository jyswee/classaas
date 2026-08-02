/**
 * Social commands — reviews, messaging, community.
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function strFlag(args, name) {
  const v = getFlag(args, name);
  return (v && v !== true) ? v : null;
}

// caas reviews COURSE — list reviews
async function reviews(client, args, json) {
  validateFlags(args, ['page', 'limit'], 'caas reviews COURSE_ID');
  const courseId = positionalArgs(args)[0];
  if (!courseId) { fmt.err('Usage: caas reviews COURSE_ID'); process.exit(1); }
  const result = await client.reviews(courseId, '');
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.reviews || result.data)) || [];
  if (!rows.length) return fmt.info('No reviews yet.');
  fmt.heading('Reviews');
  rows.forEach(rv => {
    const stars = `${fmt.C.yellow}${'★'.repeat(rv.stars || rv.rating || 0)}${fmt.C.reset}`;
    console.log(`  ${fmt.pad(stars, 16)} ${rv.body || rv.comment || rv.title || ''} ${fmt.C.gray}${rv._id || ''}${fmt.C.reset}`);
  });
  console.log(fmt.count(rows.length, 'review'));
}

// caas review COURSE --stars 5 -m "Great course"
async function review(client, args, json) {
  validateFlags(args, ['stars', 'm', 'message', 'reply', 'delete'],
    'caas review COURSE_ID --stars 5 -m "Great" | caas review reply REVIEW_ID -m "Thanks" | caas review delete REVIEW_ID');
  const sub = args[0];
  if (sub === 'reply') {
    const reviewId = positionalArgs(args.slice(1))[0];
    const msg = strFlag(args, 'message') || strFlag(args, 'm');
    if (!reviewId || !msg) { fmt.err('Usage: caas review reply REVIEW_ID -m "text"'); process.exit(1); }
    const result = await client.replyReview(reviewId, { body: msg });
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Reply posted');
  }
  if (sub === 'delete' || sub === 'rm') {
    const reviewId = positionalArgs(args.slice(1))[0];
    if (!reviewId) { fmt.err('Usage: caas review delete REVIEW_ID'); process.exit(1); }
    const result = await client.deleteReview(reviewId);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Review deleted');
  }
  const courseId = positionalArgs(args)[0];
  const stars = strFlag(args, 'stars');
  const msg = strFlag(args, 'message') || strFlag(args, 'm');
  if (!courseId || !stars) { fmt.err('Usage: caas review COURSE_ID --stars 5 -m "Great course"'); process.exit(1); }
  const result = await client.createReview(courseId, { stars: Number(stars), body: msg || '' });
  if (json) return console.log(JSON.stringify(result, null, 2));
  fmt.ok('Review submitted');
}

// caas inbox — list conversations
async function inbox(client, args, json) {
  const result = await client.conversations();
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.conversations || result.data)) || [];
  if (!rows.length) return fmt.info('No conversations.');
  fmt.heading('Conversations');
  rows.forEach(c => {
    const id = fmt.pad(`${fmt.C.orange}${c._id}${fmt.C.reset}`, 40);
    const who = (c.participants || []).map(p => p.email || (p.profile && p.profile.firstName) || '').filter(Boolean).join(', ');
    const unread = c.unreadCount ? ` ${fmt.C.yellow}(${c.unreadCount} unread)${fmt.C.reset}` : '';
    console.log(`${id} ${who}${unread}`);
  });
}

// caas msg CONV_ID ["text"] — show messages or send
async function msg(client, args, json) {
  validateFlags(args, ['limit'], 'caas msg CONV_ID ["message text"]');
  const pos = positionalArgs(args);
  const convId = pos[0];
  if (!convId) { fmt.err('Usage: caas msg CONV_ID ["message text"]'); process.exit(1); }
  const body = pos.slice(1).join(' ').trim();
  if (body) {
    const result = await client.sendMessage(convId, { body });
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Message sent');
  }
  const result = await client.conversationMessages(convId, '');
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.messages || result.data)) || [];
  if (!rows.length) return fmt.info('No messages.');
  rows.forEach(m => {
    const from = (m.senderId && (m.senderId.email || m.senderId.profile?.firstName)) || m.senderId || '?';
    console.log(`${fmt.C.cyan}${from}${fmt.C.reset} ${fmt.C.gray}${m.createdAt || ''}${fmt.C.reset}\n  ${m.body || m.content || ''}`);
  });
}

// caas broadcast COURSE "text" — post to the course broadcast channel (creator)
async function broadcast(client, args, json) {
  const pos = positionalArgs(args);
  const courseId = pos[0];
  const body = pos.slice(1).join(' ').trim();
  if (!courseId || !body) { fmt.err('Usage: caas broadcast COURSE_ID "message to all students"'); process.exit(1); }
  // Open (or fetch) the course broadcast conversation, then post into it
  const convRes = await client.broadcast(courseId, {});
  const conv = (convRes.data && (convRes.data.conversation || convRes.data)) || {};
  if (!conv._id) {
    if (json) return console.log(JSON.stringify(convRes, null, 2));
    fmt.err('Could not open broadcast conversation'); process.exit(1);
  }
  const result = await client.sendMessage(conv._id, { body });
  if (json) return console.log(JSON.stringify(result, null, 2));
  fmt.ok('Broadcast sent');
}

// caas community — org forum: categories → posts → replies
async function community(client, args, json) {
  const sub = args[0];
  if (sub === 'categories') {
    const result = await client.communityCategories();
    if (json) return console.log(JSON.stringify(result, null, 2));
    const rows = (result.data && (result.data.categories || result.data)) || [];
    if (!rows.length) return fmt.info('No categories.');
    fmt.heading('Community Categories');
    rows.forEach(c => console.log(`  ${fmt.pad(`${fmt.C.orange}${c._id}${fmt.C.reset}`, 40)} ${c.name || ''}`));
    return;
  }
  if (sub === 'category') {
    // caas community category create "name" [-d DESC]  (org_admin)
    validateFlags(args.slice(2), ['d', 'description'], 'caas community category create "name" [-d DESC]');
    if (args[1] !== 'create') { fmt.err('Usage: caas community category create "name"'); process.exit(1); }
    const name = positionalArgs(args.slice(2)).join(' ').trim();
    if (!name) { fmt.err('Usage: caas community category create "name"'); process.exit(1); }
    const data = { name };
    const desc = strFlag(args, 'description') || strFlag(args, 'd');
    if (desc) data.description = desc;
    const result = await client.createCommunityCategory(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const c = (result.data && (result.data.category || result.data)) || {};
    return fmt.ok(`Category created${c._id ? `: ${c._id}` : ''}`);
  }
  if (sub === 'post') {
    // caas community post "Title" -m "body" [--category ID]
    validateFlags(args.slice(1), ['m', 'message', 'category'], 'caas community post "Title" -m "body" [--category CATEGORY_ID]');
    const title = positionalArgs(args.slice(1)).join(' ').trim();
    const body = strFlag(args, 'message') || strFlag(args, 'm');
    if (!title || !body) { fmt.err('Usage: caas community post "Title" -m "body"'); process.exit(1); }
    const data = { title, body };
    let cat = strFlag(args, 'category');
    if (!cat) {
      // Default to the first category
      const cats = await client.communityCategories();
      const rows = (cats.data && (cats.data.categories || cats.data)) || [];
      if (!rows.length) { fmt.err('No community categories exist — an org_admin must run: caas community category create "name"'); process.exit(1); }
      cat = rows[0]._id;
    }
    data.categoryId = cat;
    const result = await client.createCommunityPost(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const p = (result.data && (result.data.post || result.data)) || {};
    return fmt.ok(`Posted${p._id ? `: ${p._id}` : ''}`);
  }
  if (sub === 'reply') {
    const postId = positionalArgs(args.slice(1))[0];
    const body = positionalArgs(args.slice(1)).slice(1).join(' ').trim();
    if (!postId || !body) { fmt.err('Usage: caas community reply POST_ID "text"'); process.exit(1); }
    const result = await client.replyCommunityPost(postId, { body });
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Reply posted');
  }
  if (sub === 'upvote') {
    const postId = positionalArgs(args.slice(1))[0];
    if (!postId) { fmt.err('Usage: caas community upvote POST_ID'); process.exit(1); }
    const result = await client.upvoteCommunityPost(postId);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Upvoted');
  }
  if (sub === 'show') {
    const postId = positionalArgs(args.slice(1))[0];
    if (!postId) { fmt.err('Usage: caas community show POST_ID'); process.exit(1); }
    const [post, replies] = await Promise.all([client.communityPost(postId), client.communityReplies(postId)]);
    if (json) return console.log(JSON.stringify({ post: post.data, replies: replies.data }, null, 2));
    const p = post.data || {};
    fmt.heading(p.title || postId);
    console.log(`  ${p.body || ''}`);
    const rows = (replies.data && (replies.data.replies || replies.data)) || [];
    rows.forEach(rp => console.log(`  ${fmt.C.cyan}↳${fmt.C.reset} ${rp.body || ''} ${fmt.C.gray}${rp.createdAt || ''}${fmt.C.reset}`));
    return;
  }
  // Default: list posts (optionally --category ID)
  validateFlags(args, ['category', 'page', 'limit'], 'caas community [--category CATEGORY_ID]');
  const params = [];
  const cat = strFlag(args, 'category');
  if (cat) params.push(`categoryId=${encodeURIComponent(cat)}`);
  const result = await client.communityPosts(params.join('&'));
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.posts || result.data)) || [];
  if (!rows.length) return fmt.info('No posts.');
  fmt.heading('Community Posts');
  rows.forEach(p => {
    console.log(`  ${fmt.pad(`${fmt.C.orange}${p._id}${fmt.C.reset}`, 40)} ${p.title || ''} ${fmt.C.gray}${p.replyCount ?? ''}${fmt.C.reset}`);
  });
  console.log(fmt.count(rows.length, 'post'));
}

module.exports = { reviews, review, inbox, msg, broadcast, community };
