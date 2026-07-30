/**
 * ClassaaS API client — zero dependencies, Node built-in https only.
 * All responses follow { success, message, data } convention.
 */
const pkg = require('../package.json');

function request(baseUrl, token, method, path, body) {
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
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const API = '/api/v1';

function api(config) {
  const r = (method, path, body) => request(config.baseUrl, config.token, method, path, body);
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
    course: (slug) => r('GET', `${API}/courses/catalog/${encodeURIComponent(slug)}`),
    enroll: (courseId) => r('POST', `${API}/courses/enroll/${encodeURIComponent(courseId)}`),

    // Learning
    progress: (courseId) => r('GET', `${API}/courses/learn/${encodeURIComponent(courseId)}/progress`),
    quiz: (courseId, quizId) => r('GET', `${API}/courses/learn/${encodeURIComponent(courseId)}/quiz/${encodeURIComponent(quizId)}`),
    submitQuiz: (courseId, quizId, data) => r('POST', `${API}/courses/learn/${encodeURIComponent(courseId)}/quiz/${encodeURIComponent(quizId)}/submit`, data),

    // Student dashboard
    myCourses: (params) => r('GET', `${API}/student/my-courses${q(params)}`),
    myStats: () => r('GET', `${API}/student/my-courses/stats`),
    myCertificates: () => r('GET', `${API}/student/my-courses/certificates`),

    // Credentials (accreditation)
    myCredentials: () => r('GET', `${API}/credentials/mine`),
    verifyCredential: (code) => r('GET', `${API}/credentials/verify/${encodeURIComponent(code)}`),

    // Cohorts + instructors
    cohorts: () => r('GET', `${API}/cohorts`),
    cohort: (id) => r('GET', `${API}/cohorts/${encodeURIComponent(id)}`),
    createCohort: (data) => r('POST', `${API}/cohorts`, data),
    updateCohort: (id, data) => r('PATCH', `${API}/cohorts/${encodeURIComponent(id)}`, data),
    addCohortMembers: (id, data) => r('POST', `${API}/cohorts/${encodeURIComponent(id)}/members`, data),
    grantInstructor: (data) => r('POST', `${API}/cohorts/instructors/grant`, data),

    // Bundles
    bundlesPublic: () => r('GET', `${API}/bundles/public`),
    bundlePublic: (slug) => r('GET', `${API}/bundles/public/${encodeURIComponent(slug)}`),
    myBundles: () => r('GET', `${API}/bundles`),
    enrollBundle: (id) => r('POST', `${API}/bundles/${encodeURIComponent(id)}/enroll`),
  };
}

// Standalone (no auth)
function login(baseUrl, data) {
  return request(baseUrl, null, 'POST', `${API}/auth/login`, data);
}

module.exports = { api, request, login };
