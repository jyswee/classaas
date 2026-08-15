#!/usr/bin/env node
// Published installs ship dist/ only; a dev tree also has src/. Decide by
// asking whether dist/ was built, NOT by catching MODULE_NOT_FOUND: Node
// appends the require stack to that error message, so a missing
// dist/commands/*.js used to match a `dist/main` test and silently retry src/,
// which does not exist in the tarball.
const fs = require('fs');
const path = require('path');

if (fs.existsSync(path.join(__dirname, '..', 'dist', 'main.js'))) {
  require('../dist/main');
} else {
  require('../src/main');
}
