#!/usr/bin/env node
try {
  require('../dist/main');
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND' && e.message.includes('dist/main')) {
    // Dev mode - source not built, fall back to src/
    require('../src/main');
  } else {
    throw e;
  }
}
