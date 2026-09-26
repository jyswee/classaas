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

    // Platform admin (super_admin) — routes/platformAdmin.js @ /admin
    adminStats: (params) => r('GET', `${API}/admin/stats${q(params)}`),
    adminRevenueTrends: (params) => r('GET', `${API}/admin/revenue-trends${q(params)}`),
    adminUsers: (params) => r('GET', `${API}/admin/users${q(params)}`),
    adminOrgs: (params) => r('GET', `${API}/admin/organizations${q(params)}`),
    adminUsage: (params) => r('GET', `${API}/admin/usage${q(params)}`),
    adminUsageRefresh: (orgId) => r('POST', `${API}/admin/usage/${e(orgId)}/refresh`),
    adminHealth: () => r('GET', `${API}/admin/health/detailed`),
    adminEmailDeliverability: () => r('GET', `${API}/admin/email-deliverability`),
    adminImpersonate: (userId) => r('POST', `${API}/admin/impersonate/${e(userId)}`),
    adminImpersonateStop: (data) => r('POST', `${API}/admin/impersonate/stop`, data || {}),
    adminQueues: () => r('GET', `${API}/admin/queues`),
    adminQueueJobs: (name, params) => r('GET', `${API}/admin/queues/${e(name)}/jobs${q(params)}`),
    adminQueueRetry: (name) => r('POST', `${API}/admin/queues/${e(name)}/retry-failed`),
    adminQueueDrain: (name) => r('POST', `${API}/admin/queues/${e(name)}/drain`),
    adminBootstrap: () => r('POST', `${API}/admin/bootstrap`),
    adminMigrateCourses: (data) => r('POST', `${API}/admin/migrate-courses`, data || {}, 12 * 60 * 1000),
    adminScaffoldAccreditation: () => r('POST', `${API}/admin/scaffold-accreditation`, {}, 12 * 60 * 1000),

    // Durable API keys (any authed user; super_admin may target ?userId=/?all=) — routes/apiKeys.js @ /api-keys
    apikeyMint: (data) => r('POST', `${API}/api-keys`, data),
    apikeyList: (params) => r('GET', `${API}/api-keys${q(params)}`),
    apikeyRevoke: (keyId) => r('DELETE', `${API}/api-keys/${e(keyId)}`),

    // Student CRM (host/org_admin/super_admin) — routes/sdk/crm.js @ /sdk/crm
    adminStudents: (params) => r('GET', `${API}/sdk/crm/students${q(params)}`),
    adminStudent: (userId) => r('GET', `${API}/sdk/crm/students/${e(userId)}`),
    adminStudentTags: (userId, data) => r('PUT', `${API}/sdk/crm/students/${e(userId)}/tags`, data),
    adminStudentNote: (userId, data) => r('POST', `${API}/sdk/crm/students/${e(userId)}/notes`, data),
    adminStudentsExport: (params) => r('GET', `${API}/sdk/crm/students/export${q(params)}`),

    // Organization management (org_admin/super_admin) — routes/organizations.js @ /organizations
    myOrgById: (params) => r('GET', `${API}/organizations/mine${q(params)}`),
    verifyOrgDomain: (data) => r('POST', `${API}/organizations/mine/domain/verify`, data || {}),
    orgRolePermissions: () => r('GET', `${API}/organizations/mine/role-permissions`),
    setOrgRolePermissions: (data) => r('PUT', `${API}/organizations/mine/role-permissions`, data),
    orgPayoutsConsolidated: (params) => r('GET', `${API}/organizations/mine/payouts-consolidated${q(params)}`),
    runOrgPayoutsConsolidated: (data) => r('POST', `${API}/organizations/mine/payouts-consolidated/run`, data || {}),

    // Compliance + audit (super_admin/org_admin) — routes/compliance.js @ /compliance
    auditTrail: (params) => r('GET', `${API}/compliance/audit-trail${q(params)}`),
    securityAssessment: () => r('GET', `${API}/compliance/security-assessment`),
    complianceDashboard: () => r('GET', `${API}/compliance/dashboard`),
    complianceReport: (data) => r('POST', `${API}/compliance/reports`, data),

    // Affiliates (host/org_admin/super_admin) — routes/affiliates.js @ /affiliates
    affiliates: () => r('GET', `${API}/affiliates`),
    approveAffiliate: (id) => r('PUT', `${API}/affiliates/${e(id)}/approve`),
    suspendAffiliate: (id) => r('PUT', `${API}/affiliates/${e(id)}/suspend`),
    setAffiliateRate: (id, data) => r('PUT', `${API}/affiliates/${e(id)}/commission-rate`, data),
    affiliatesStats: () => r('GET', `${API}/affiliates/stats`),

    // Community moderation (org_admin/super_admin) — routes/community.js @ /community
    createCommunityCategory: (data) => r('POST', `${API}/community/categories`, data),
    updateCommunityCategory: (id, data) => r('PUT', `${API}/community/categories/${e(id)}`, data),
    deleteCommunityCategory: (id) => r('DELETE', `${API}/community/categories/${e(id)}`),
    pinCommunityPost: (id) => r('PATCH', `${API}/community/posts/${e(id)}/pin`),
    lockCommunityPost: (id) => r('PATCH', `${API}/community/posts/${e(id)}/lock`),

    // SSO config (org_admin/super_admin) — routes/sso.js @ /auth/sso
    ssoConfig: () => r('GET', `${API}/auth/sso/config`),
    setSsoConfig: (data) => r('PUT', `${API}/auth/sso/config`, data),
    testSsoConfig: (data) => r('POST', `${API}/auth/sso/config/test`, data || {}),
    disableSso: () => r('DELETE', `${API}/auth/sso/config`),
    ssoUsers: () => r('GET', `${API}/auth/sso/users`),

    // Theming custom CSS (org_admin/super_admin) — routes/theming.js @ /theming
    customCss: (orgId) => r('GET', `${API}/theming/custom-css/${e(orgId)}`),
    setCustomCss: (orgId, data) => r('PUT', `${API}/theming/custom-css/${e(orgId)}`, data),
    deleteCustomCss: (orgId) => r('DELETE', `${API}/theming/custom-css/${e(orgId)}`),
    customCssHistory: (orgId) => r('GET', `${API}/theming/custom-css/${e(orgId)}/history`),
    restoreCustomCss: (orgId, index) => r('PUT', `${API}/theming/custom-css/${e(orgId)}/restore/${e(index)}`),

    // Student dashboard config (org_admin/super_admin) — routes/studentDashboardConfig.js
    studentDashboardConfig: () => r('GET', `${API}/student-dashboard-config`),
    setStudentDashboardConfig: (data) => r('PUT', `${API}/student-dashboard-config`, data),

    // Abandoned carts (host/org_admin/super_admin) — routes/abandonedCarts.js
    abandonedCarts: (params) => r('GET', `${API}/abandoned-carts${q(params)}`),
    abandonedCartsStats: () => r('GET', `${API}/abandoned-carts/stats`),

    // Feature flags (super_admin)
    featureFlags: () => r('GET', `${API}/feature-flags/`),
    createFeatureFlag: (data) => r('POST', `${API}/feature-flags/`, data),
    updateFeatureFlag: (id, data) => r('PUT', `${API}/feature-flags/${e(id)}`, data),
    deleteFeatureFlag: (id) => r('DELETE', `${API}/feature-flags/${e(id)}`),

    // Coupons
    validateCoupon: (data) => r('POST', `${API}/coupons/validate`, data),
    coupons: (params) => r('GET', `${API}/coupons/${q(params)}`),
    coupon: (id) => r('GET', `${API}/coupons/${e(id)}`),
    createCoupon: (data) => r('POST', `${API}/coupons/`, data),
    updateCoupon: (id, data) => r('PUT', `${API}/coupons/${e(id)}`, data),
    deactivateCoupon: (id) => r('PATCH', `${API}/coupons/${e(id)}/deactivate`),
    deleteCoupon: (id) => r('DELETE', `${API}/coupons/${e(id)}`),
    couponsAnalytics: (params) => r('GET', `${API}/coupons/analytics/overview${q(params)}`),

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

    // ── Discussions (course Q&A threads; enrolled-or-creator) ──
    discussions: (courseId, params) => r('GET', `${API}/discussions/${e(courseId)}${q(params)}`),
    discussion: (courseId, discussionId) => r('GET', `${API}/discussions/${e(courseId)}/${e(discussionId)}`),
    createDiscussion: (courseId, data) => r('POST', `${API}/discussions/${e(courseId)}`, data),
    replyDiscussion: (courseId, discussionId, data) => r('POST', `${API}/discussions/${e(courseId)}/${e(discussionId)}/replies`, data),
    upvoteDiscussion: (courseId, discussionId) => r('POST', `${API}/discussions/${e(courseId)}/${e(discussionId)}/upvote`),
    pinDiscussion: (courseId, discussionId) => r('PUT', `${API}/discussions/${e(courseId)}/${e(discussionId)}/pin`),
    resolveDiscussion: (courseId, discussionId) => r('PUT', `${API}/discussions/${e(courseId)}/${e(discussionId)}/resolve`),
    deleteDiscussion: (courseId, discussionId) => r('DELETE', `${API}/discussions/${e(courseId)}/${e(discussionId)}`),

    // ── Assignments (creator authoring + student submissions + grading) ──
    assignments: (params) => r('GET', `${API}/assignments${q(params)}`),
    createAssignment: (data) => r('POST', `${API}/assignments`, data),
    updateAssignment: (id, data) => r('PUT', `${API}/assignments/${e(id)}`, data),
    deleteAssignment: (id) => r('DELETE', `${API}/assignments/${e(id)}`),
    myAssignmentSubmission: (id) => r('GET', `${API}/assignments/${e(id)}/my`),
    submitAssignment: (id, data) => r('POST', `${API}/assignments/${e(id)}/submissions`, data),
    assignmentInbox: (params) => r('GET', `${API}/assignments/inbox${q(params)}`),
    gradeSubmission: (submissionId, data) => r('PATCH', `${API}/assignments/submissions/${e(submissionId)}/grade`, data),

    // ── Wishlist ──
    wishlist: () => r('GET', `${API}/wishlist/`),
    addWishlist: (courseId) => r('POST', `${API}/wishlist/`, { courseId }),
    removeWishlist: (courseId) => r('DELETE', `${API}/wishlist/${e(courseId)}`),

    // ── Achievements (creator CRUD + student earned/streak) ──
    achievements: () => r('GET', `${API}/achievements/`),
    createAchievement: (data) => r('POST', `${API}/achievements/`, data),
    updateAchievement: (id, data) => r('PUT', `${API}/achievements/${e(id)}`, data),
    deleteAchievement: (id) => r('DELETE', `${API}/achievements/${e(id)}`),
    myAchievements: () => r('GET', `${API}/achievements/my`),
    myStreak: () => r('GET', `${API}/achievements/my/streak`),

    // ── Certificate template (creator branding) ──
    certificateTemplate: () => r('GET', `${API}/certificate-templates/my`),
    saveCertificateTemplate: (data) => r('PUT', `${API}/certificate-templates/my`, data),

    // ── Lesson notes + bookmarks (mounted at /learn) ──
    notes: (params) => r('GET', `${API}/learn/notes${q(params)}`),
    saveNote: (data) => r('PUT', `${API}/learn/notes`, data),
    deleteNote: (id) => r('DELETE', `${API}/learn/notes/${e(id)}`),
    bookmarks: (params) => r('GET', `${API}/learn/bookmarks${q(params)}`),
    addBookmark: (data) => r('POST', `${API}/learn/bookmarks`, data),
    deleteBookmark: (id) => r('DELETE', `${API}/learn/bookmarks/${e(id)}`),
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
