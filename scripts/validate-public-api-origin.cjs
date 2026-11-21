'use strict';
process.env.NODE_ENV = 'production';
require('react-scripts/config/env');
const { publicApiOrigin } = require('../src/lib/publicApiOrigin.js');
try {
  publicApiOrigin(process.env.REACT_APP_API_ORIGIN);
  console.log('MOVO public API routing configuration: PASS.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
