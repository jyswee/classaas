/**
 * ClassaaS API client — zero dependencies, Node built-in https only.
 * All responses follow { success, message, data } convention.
 */
const pkg = require('../package.json');

function request(baseUrl, token, method, path, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? require('https') : require('http');

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': `caas-cli/${pkg.version}`,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.message || parsed.error || `HTTP ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch {
          if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
          else resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs || 30000, () => { req.destroy(); reject(new Error('Request timeout')); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const API = '/api/v1';
const e = encodeURIComponent;

function api(config) {
  const r = (method, path, body, timeoutMs) => request(config.baseUrl, config.token, method, path, body, timeoutMs);
  const q = (params) => params ? `?${params}` : '';

  return {
    baseUrl: config.baseUrl,
    token: config.token,

    // Health (root, no /api/v1 prefix)
    health: () => r('GET', '/health'),

    // Auth
    me: () => r('GET', `${API}/auth/me`),

    // Courses (public catalog)
    catalog: (params) => r('GET', `${API}/courses/catalog${q(params)}`),
    catalogSearch: (params) => r('GET', `${API}/courses/catalog/search${q(params)}`),
    categories: () => r('GET', `${API}/courses/catalog/categories`),
    course: (slug) => r('GET', `${API}/courses/catalog/${e(slug)}`),
    enroll: (courseId) => r('POST', `${API}/courses/enroll/${e(courseId)}`),

    // Learning
    learn: (courseId) => r('GET', `${API}/courses/learn/${e(courseId)}`),
    progress: (courseId) => r('GET', `${API}/courses/learn/${e(courseId)}/progress`),
    postProgress: (courseId, data) => r('POST', `${API}/courses/learn/${e(courseId)}/progress`, data),
    quiz: (courseId, quizId) => r('GET', `${API}/courses/learn/${e(courseId)}/quiz/${e(quizId)}`),
    submitQuiz: (courseId, quizId, data) => r('POST', `${API}/courses/learn/${e(courseId)}/quiz/${e(quizId)}/submit`, data),
    quizAttempts: (courseId, quizId) => r('GET', `${API}/courses/learn/${e(courseId)}/quiz/${e(quizId)}/attempts`),
    certificate: (courseId) => r('GET', `${API}/courses/learn/${e(courseId)}/certificate`),

    // Student dashboard
    myCourses: (params) => r('GET', `${API}/student/my-courses${q(params)}`),
    myStats: () => r('GET', `${API}/student/my-courses/stats`),
    myCertificates: () => r('GET', `${API}/student/my-courses/certificates`),
    myOrders: () => r('GET', `${API}/student/my-orders`),

    // Credentials (accreditation)
    myCredentials: () => r('GET', `${API}/credentials/mine`),
    verifyCredential: (code) => r('GET', `${API}/credentials/verify/${e(code)}`),

    // ── Course management (creator: host/org_admin/super_admin) ──
    manageCourses: (params) => r('GET', `${API}/course-management/${q(params)}`),
    createCourse: (data) => r('POST', `${API}/course-management/`, data),
    manageCourse: (id) => r('GET', `${API}/course-management/${e(id)}`),
    updateCourse: (id, data) => r('PUT', `${API}/course-management/${e(id)}`, data),
    deleteCourse: (id) => r('DELETE', `${API}/course-management/${e(id)}`),
    publishCourse: (id) => r('POST', `${API}/course-management/${e(id)}/publish`),
    archiveCourse: (id) => r('POST', `${API}/course-management/${e(id)}/archive`),
    duplicateCourse: (id, data) => r('POST', `${API}/course-management/${e(id)}/duplicate`, data),
    addSection: (courseId, data) => r('POST', `${API}/course-management/${e(courseId)}/sections`, data),
    updateSection: (courseId, sectionId, data) => r('PUT', `${API}/course-management/${e(courseId)}/sections/${e(sectionId)}`, data),
    deleteSection: (courseId, sectionId) => r('DELETE', `${API}/course-management/${e(courseId)}/sections/${e(sectionId)}`),
    addLesson: (courseId, sectionId, data) => r('POST', `${API}/course-management/${e(courseId)}/sections/${e(sectionId)}/lessons`, data),
    updateLesson: (courseId, sectionId, lessonId, data) => r('PUT', `${API}/course-management/${e(courseId)}/sections/${e(sectionId)}/lessons/${e(lessonId)}`, data),
    deleteLesson: (courseId, sectionId, lessonId) => r('DELETE', `${API}/course-management/${e(courseId)}/sections/${e(sectionId)}/lessons/${e(lessonId)}`),
    setLessonQuiz: (courseId, sectionId, lessonId, data) => r('POST', `${API}/course-management/${e(courseId)}/sections/${e(sectionId)}/lessons/${e(lessonId)}/quiz`, data),
    getLessonQuiz: (courseId, sectionId, lessonId) => r('GET', `${API}/course-management/${e(courseId)}/sections/${e(sectionId)}/lessons/${e(lessonId)}/quiz`),
    deleteLessonQuiz: (courseId, sectionId, lessonId) => r('DELETE', `${API}/course-management/${e(courseId)}/sections/${e(sectionId)}/lessons/${e(lessonId)}/quiz`),
    courseStudents: (courseId, params) => r('GET', `${API}/course-management/${e(courseId)}/students${q(params)}`),
    studentDrilldown: (courseId, userId) => r('GET', `${API}/course-management/${e(courseId)}/student/${e(userId)}/drilldown`),
    bulkEnroll: (courseId, data) => r('POST', `${API}/course-management/${e(courseId)}/bulk-enroll`, data),
    courseAnalytics: (courseId) => r('GET', `${API}/course-management/${e(courseId)}/analytics`),
    engagement: (params) => r('GET', `${API}/course-management/analytics/engagement${q(params)}`),
    cohortAnalytics: () => r('GET', `${API}/course-management/analytics/cohorts`),

    // Reviews
    reviews: (courseId, params) => r('GET', `${API}/reviews/courses/${e(courseId)}/reviews${q(params)}`),
    createReview: (courseId, data) => r('POST', `${API}/reviews/courses/${e(courseId)}/reviews`, data),
    replyReview: (reviewId, data) => r('POST', `${API}/reviews/${e(reviewId)}/reply`, data),
    deleteReview: (reviewId) => r('DELETE', `${API}/reviews/${e(reviewId)}`),

    // Messaging
    conversations: () => r('GET', `${API}/messages/conversations`),
    createConversation: (data) => r('POST', `${API}/messages/conversations`, data),
    conversationMessages: (id, params) => r('GET', `${API}/messages/conversations/${e(id)}/messages${q(params)}`),
    sendMessage: (id, data) => r('POST', `${API}/messages/conversations/${e(id)}/messages`, data),
    markRead: (id) => r('POST', `${API}/messages/conversations/${e(id)}/read`),
    broadcast: (courseId, data) => r('POST', `${API}/messages/conversations/course/${e(courseId)}/broadcast`, data),
    searchUsers: (params) => r('GET', `${API}/messages/users/search${q(params)}`),

    // Community (org-scoped forum: categories → posts → replies)
    communityCategories: () => r('GET', `${API}/community/categories`),
    createCommunityCategory: (data) => r('POST', `${API}/community/categories`, data),
    communityPosts: (params) => r('GET', `${API}/community/posts${q(params)}`),
    createCommunityPost: (data) => r('POST', `${API}/community/posts`, data),
    communityPost: (id) => r('GET', `${API}/community/posts/${e(id)}`),
    communityReplies: (id) => r('GET', `${API}/community/posts/${e(id)}/replies`),
    replyCommunityPost: (id, data) => r('POST', `${API}/community/posts/${e(id)}/replies`, data),
    upvoteCommunityPost: (id) => r('POST', `${API}/community/posts/${e(id)}/upvote`),

    // Memberships
    membershipsPublic: () => r('GET', `${API}/memberships/public`),
    memberships: (params) => r('GET', `${API}/memberships/${q(params)}`),
    createMembership: (data) => r('POST', `${API}/memberships/`, data),
    myMemberships: () => r('GET', `${API}/memberships/my`),
    subscribeMembership: (id) => r('POST', `${API}/memberships/${e(id)}/subscribe`),
    cancelMembership: (id) => r('POST', `${API}/memberships/my/${e(id)}/cancel`),

    // Digital products
    productsPublic: () => r('GET', `${API}/digital-products/public`),
    products: (params) => r('GET', `${API}/digital-products/${q(params)}`),
    createProduct: (data) => r('POST', `${API}/digital-products/`, data),
    myProducts: () => r('GET', `${API}/digital-products/my`),

    // Coaching
    coachingPublic: () => r('GET', `${API}/coaching/public`),
    coaching: (params) => r('GET', `${API}/coaching/${q(params)}`),
    createCoaching: (data) => r('POST', `${API}/coaching/`, data),
    myCoaching: () => r('GET', `${API}/coaching/my`),

    // Payments / money
    payments: (params) => r('GET', `${API}/payments/${q(params)}`),
    paymentAnalytics: () => r('GET', `${API}/payments/analytics`),
    revenue: (params) => r('GET', `${API}/payments/analytics/revenue${q(params)}`),

    // Stripe Connect + payouts
    connectStatus: () => r('GET', `${API}/stripe-connect/account-status`),
    connectCreate: (data) => r('POST', `${API}/stripe-connect/create-account`, data),
    connectLink: () => r('POST', `${API}/stripe-connect/account-link`),
    payouts: (params) => r('GET', `${API}/payouts/${q(params)}`),
    payout: (id) => r('GET', `${API}/payouts/${e(id)}`),
    payoutsPending: () => r('GET', `${API}/payouts/pending/payments`),
    payoutsDashboard: () => r('GET', `${API}/payouts/dashboard/summary`),
    cancelPayout: (id) => r('PUT', `${API}/payouts/${e(id)}/cancel`),

    // Analytics (forecast/insights)
    dashboardSummary: () => r('GET', `${API}/analytics/dashboard-summary`),
    revenueForecast: () => r('GET', `${API}/analytics/revenue-forecast`),
    customerAnalytics: () => r('GET', `${API}/analytics/customer-analytics`),

    // Organization (org_admin)
    myOrg: () => r('GET', `${API}/organizations/mine`),
    setOrgDomain: (data) => r('PUT', `${API}/organizations/mine/domain`, data),

    // Platform admin (super_admin)
    adminStats: () => r('GET', `${API}/admin/stats`),
    adminUsers: () => r('GET', `${API}/admin/users`),
    adminOrgs: () => r('GET', `${API}/admin/organizations`),
    adminHealth: () => r('GET', `${API}/admin/health/detailed`),
    adminBootstrap: () => r('POST', `${API}/admin/bootstrap`),
    adminMigrateCourses: (data) => r('POST', `${API}/admin/migrate-courses`, data || {}, 12 * 60 * 1000),
    adminScaffoldAccreditation: () => r('POST', `${API}/admin/scaffold-accreditation`, {}, 12 * 60 * 1000),

    // Feature flags (super_admin)
    featureFlags: () => r('GET', `${API}/feature-flags/`),
    createFeatureFlag: (data) => r('POST', `${API}/feature-flags/`, data),
    updateFeatureFlag: (id, data) => r('PUT', `${API}/feature-flags/${e(id)}`, data),
    deleteFeatureFlag: (id) => r('DELETE', `${API}/feature-flags/${e(id)}`),

    // Coupons
    validateCoupon: (data) => r('POST', `${API}/coupons/validate`, data),
    coupons: (params) => r('GET', `${API}/coupons/${q(params)}`),
    createCoupon: (data) => r('POST', `${API}/coupons/`, data),
    deleteCoupon: (id) => r('DELETE', `${API}/coupons/${e(id)}`),

    // Cohorts + instructors
    cohorts: () => r('GET', `${API}/cohorts`),
    cohort: (id) => r('GET', `${API}/cohorts/${e(id)}`),
    createCohort: (data) => r('POST', `${API}/cohorts`, data),
    updateCohort: (id, data) => r('PATCH', `${API}/cohorts/${e(id)}`, data),
    addCohortMembers: (id, data) => r('POST', `${API}/cohorts/${e(id)}/members`, data),
    grantInstructor: (data) => r('POST', `${API}/cohorts/instructors/grant`, data),

    // Bundles
    bundlesPublic: () => r('GET', `${API}/bundles/public`),
    bundlePublic: (slug) => r('GET', `${API}/bundles/public/${e(slug)}`),
    myBundles: () => r('GET', `${API}/bundles`),
    enrollBundle: (id) => r('POST', `${API}/bundles/${e(id)}/enroll`),

    // ── Live classes (video calls) — management verbs only. join/start return a
    // tokenless room URL; the room page re-checks access from the viewer's own
    // session, so no bearer ever rides in the link (routes/videoCalls.js).
    liveClasses: (params) => r('GET', `${API}/video-calls/${q(params)}`),
    liveClassesActive: () => r('GET', `${API}/video-calls/active`),
    liveClassesScheduled: (params) => r('GET', `${API}/video-calls/scheduled${q(params)}`),
    liveClassAnalytics: (params) => r('GET', `${API}/video-calls/analytics${q(params)}`),
    liveClass: (id) => r('GET', `${API}/video-calls/${e(id)}`),
    scheduleLiveClass: (data) => r('POST', `${API}/video-calls/`, data),
    updateLiveClass: (id, data) => r('PUT', `${API}/video-calls/${e(id)}`, data),
    cancelLiveClass: (id) => r('DELETE', `${API}/video-calls/${e(id)}`),
    startLiveClass: (id) => r('POST', `${API}/video-calls/${e(id)}/start`),
    endLiveClass: (id) => r('POST', `${API}/video-calls/${e(id)}/end`),
    joinLiveClass: (id) => r('POST', `${API}/video-calls/${e(id)}/join`),
  };
}

// Standalone (no auth)
function login(baseUrl, data) {
  return request(baseUrl, null, 'POST', `${API}/auth/login`, data);
}

function signup(baseUrl, data) {
  return request(baseUrl, null, 'POST', `${API}/auth/signup`, data);
}

module.exports = { api, request, login, signup };
