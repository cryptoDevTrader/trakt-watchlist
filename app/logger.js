'use strict';

const winston = require('winston');
const log_level = process.env.LOG_LEVEL || 'info';

winston.level = log_level.toLocaleLowerCase();

module.exports = winston;