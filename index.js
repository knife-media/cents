/**
 * Knife cents bot
 *
 * Parse and store messages sent to Telegram bot
 *
 * @author Anton Lukin
 * @license MIT
 */

const mysql = require('mysql2');
const escape = require('escape-html');
const Telegraf = require('telegraf');

// Parse dotenv config
require('dotenv').config();

// Create Telegraf instance
const bot = new Telegraf(process.env.TOKEN);

// Create database instance
const database = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Parse post from message
const createPost = (msg) => {
  let post = {};

  // Set message id
  post.message = msg.message_id;

  // Set default values
  ['title', 'content', 'source', 'link'].forEach((key) => {
    post[key] = '';
  });

  // Escape html first
  text = escape(msg.text);

  // Split text to parts
  let parts = text.split("\n\n");

  // Get last element
  let label = parts[parts.length - 1];

  // Try to find link
  let match = label.match(/^(.+?):?\s+(https?:\S+)/i);

  if (match && match.length > 2) {
    // Remove last part
    parts.pop();

    post.source = match[1];
    post.link = match[2];
  }

  // Check if title exists
  if (parts.length > 1) {
    post.title = parts.shift();
  }

  // Compose post content
  post.content = parts.join("\n\n");

  return post;
}

// Show start message
bot.start((ctx, next) => {
  ctx.reply(`Отправьте свою историю со ссылкой на источник. Максимальная длина текста — 1000 знаков.`)
});

// Process post to bot
bot.on('text', (ctx, next) => {
  let text = [];

  // Set message text
  text.push(`<b>Добавлена новая заявка</b>\n${ctx.message.text}`);

  // Get sender username
  let from = ctx.message.from.username || ctx.message.from.id;

  // Update message with sender
  text.push(`<b>Автор</b>\n@${from}`)

  // Send to moderate group
  ctx.telegram.sendMessage(process.env.GROUP_MODERATE, text.join("\n\n"), {
    'parse_mode': 'HTML'
  });
});

// Process channel post
bot.on('channel_post', (ctx, next) => {
  if (ctx.chat && ctx.chat.id == process.env.CHANNEL_ID) {
    // Escape all tags first
    let post = createPost(ctx.channelPost);

    database.query(`INSERT INTO messages SET ?`, post, (err) => {
      if (err) {
        return console.error(err.message);
      }
    });
  }
});

// Process channel post edits
bot.on('edited_channel_post', (ctx, next) => {
  let sql = `UPDATE messages SET title = ?, content = ?, source = ?, link = ? WHERE message = ?`;

  if (ctx.chat && ctx.chat.id == process.env.CHANNEL_ID) {
    // Escape all tags first
    let post = createPost(ctx.editedChannelPost);

    database.query(sql, [post.title, post.content, post.source, post.link, post.message], (err) => {
      if (err) {
        return console.error(err.message);
      }
    });
  }
});

// Delete message on forward
bot.on('forward', (ctx) => {
  let msg = ctx.message;

  // Check if message forwarded from chat
  if (msg.forward_from_chat && msg.forward_from_chat.id == process.env.CHANNEL_ID) {
    database.query(`DELETE FROM messages WHERE message = ?`, [msg.forward_from_message_id], (err) => {
      if (err) {
        console.error(err.message);
      }

      try {
        // Delete message from channel
        ctx.telegram.deleteMessage(msg.forward_from_chat.id, msg.forward_from_message_id);

        // Delete current message
        ctx.deleteMessage();

      } catch (error) {
        console.error(error)
      }
    });
  }
});


/**
 * Start telegram polling
 */
bot.launch();