/*
 *@file logging.js
 *@author Jarel Pellew
 *@desc Module for Pino Logging
 */
import pino from 'pino';

const log = new pino({
  level: 'trace',
  base: null,
  prettyPrint: {
    colorize: true,
    translateTime: 'SYS:ddd mmm dd yyyy HH:MM:ss Z'
  }
});
export default log;
export const stream = {
  write: (message, encoding) => {
    log.trace(message.substring(0, (message.length-1)));
  }
};
