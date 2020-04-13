/**
 * Kopecks text format
 *
 * Store messages sent to bot in database and return with simple API
 *
 * @author Anton Lukin
 * @license MIT
 */

require('dotenv').config();

const api = require('./app/api');
const bot = require('./app/bot');


/**
 * Start express app
 */
api.listen(process.env.PORT || 3000);


/**
 * Start telegram polling
 */
bot.launch();