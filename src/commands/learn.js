/**
 * Learn commands — learner-side: content, progress, quizzes, certificates.
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function strFlag(args, name) {
  const v = getFlag(args, name);
  return (v && v !== true) ? v : null;
}

// caas learn COURSE — content + my progress
async function show(client, args, json) {
  const courseId = positionalArgs(args)[0];
  if (!courseId) { fmt.err('Usage: caas learn COURSE_ID'); process.exit(1); }
  const result = await client.learn(courseId);
  if (json) return console.log(JSON.stringify(result, null, 2));
  const d = result.data || {};
  const c = d.course || d;
  fmt.heading(c.title || courseId);
  const prog = d.progress || {};
  console.log(fmt.row('Progress', `${prog.completionPercentage ?? prog.percentage ?? 0}%`));
  (c.sections || []).forEach(s => {
    console.log(`  ${fmt.C.bold}${s.title}${fmt.C.reset} ${fmt.C.gray}(${s.sectionId})${fmt.C.reset}`);
    (s.lessons || []).forEach(l => {
      const done = (prog.completedLessons || []).some(cl => (cl.lessonId || cl) === l.lessonId);
      const mark = done ? `${fmt.C.green}✓${fmt.C.reset}` : `${fmt.C.gray}○${fmt.C.reset}`;
      console.log(`    ${mark} [${l.type || 'text'}] ${l.title} ${fmt.C.gray}${l.lessonId}${fmt.C.reset}`);
    });
  });
}

// caas complete COURSE --lesson L --section S [--time SECONDS]
async function complete(client, args, json) {
  validateFlags(args, ['lesson', 'section', 'time'], 'caas complete COURSE_ID --lesson LESSON_ID --section SECTION_ID');
  const courseId = positionalArgs(args)[0];
  const lessonId = strFlag(args, 'lesson');
  const sectionId = strFlag(args, 'section');
  if (!courseId || !lessonId || !sectionId) {
    fmt.err('Usage: caas complete COURSE_ID --lesson LESSON_ID --section SECTION_ID');
    process.exit(1);
  }
  const data = { lessonId, sectionId };
  const time = strFlag(args, 'time');
  if (time) data.timeSpent = Number(time);
  const result = await client.postProgress(courseId, data);
  if (json) return console.log(JSON.stringify(result, null, 2));
  const d = result.data || {};
  fmt.ok(`Lesson complete — course at ${d.completionPercentage ?? d.progress ?? '?'}%`);
}

// caas quiz COURSE QUIZ [--answers 1,0,2] [--attempts]
async function quiz(client, args, json) {
  validateFlags(args, ['answers', 'attempts'], 'caas quiz COURSE_ID QUIZ_ID [--answers 1,0,2] [--attempts]');
  const pos = positionalArgs(args);
  const [courseId, quizId] = pos;
  if (!courseId || !quizId) { fmt.err('Usage: caas quiz COURSE_ID QUIZ_ID [--answers 1,0,2]'); process.exit(1); }

  if (args.includes('--attempts')) {
    const result = await client.quizAttempts(courseId, quizId);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const attempts = (result.data && (result.data.attempts || result.data)) || [];
    if (!attempts.length) return fmt.info('No attempts yet.');
    fmt.heading('Quiz Attempts');
    attempts.forEach(a => {
      const passed = a.passed ? `${fmt.C.green}passed${fmt.C.reset}` : `${fmt.C.red}failed${fmt.C.reset}`;
      console.log(`  ${fmt.pad(String(a.score ?? '?') + '%', 6)} ${fmt.pad(passed, 15)} ${fmt.C.gray}${a.createdAt || ''}${fmt.C.reset}`);
    });
    return;
  }

  const answersFlag = strFlag(args, 'answers');
  if (answersFlag) {
    const answers = answersFlag.split(',').map(a => {
      const n = Number(a.trim());
      return Number.isNaN(n) ? a.trim() : n;
    });
    const result = await client.submitQuiz(courseId, quizId, { answers });
    if (json) return console.log(JSON.stringify(result, null, 2));
    const d = result.data || {};
    const passed = d.passed ? `${fmt.C.green}PASSED${fmt.C.reset}` : `${fmt.C.red}FAILED${fmt.C.reset}`;
    fmt.ok(`Score: ${d.score ?? '?'}% — ${passed}`);
    return;
  }

  // No answers → show the quiz questions
  const result = await client.quiz(courseId, quizId);
  if (json) return console.log(JSON.stringify(result, null, 2));
  const qz = (result.data && (result.data.quiz || result.data)) || {};
  fmt.heading(qz.title || 'Quiz');
  (qz.questions || []).forEach((question, i) => {
    console.log(`  ${i + 1}. ${question.question || question.text}`);
    (question.options || []).forEach((o, j) => console.log(`     ${fmt.C.gray}[${j}]${fmt.C.reset} ${o}`));
  });
  fmt.info('Submit: caas quiz COURSE_ID QUIZ_ID --answers 1,0,2');
}

// caas certificate COURSE
async function certificate(client, args, json) {
  const courseId = positionalArgs(args)[0];
  if (!courseId) { fmt.err('Usage: caas certificate COURSE_ID'); process.exit(1); }
  const result = await client.certificate(courseId);
  if (json) return console.log(JSON.stringify(result, null, 2));
  const d = result.data || {};
  fmt.ok('Certificate earned');
  if (d.certificateUrl || d.url) console.log(fmt.row('URL', d.certificateUrl || d.url));
  if (d.certificateId) console.log(fmt.row('ID', d.certificateId));
}

module.exports = { show, complete, quiz, certificate };
