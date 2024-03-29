// this file is deprecated, use dudebot2.js
process.exit()

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const Discord = require('discord.js');
const got = require('got');
const fs = require('fs');
var mysql = require('mysql');

// Config file
const config_file = 'config.json';
if (!fs.existsSync(config_file)) {
  console.log("Please create file '" + config_file + "' and populate it with your configuration.");
  process.exit();
}
var config = JSON.parse(fs.readFileSync(config_file, 'utf8'));

// The token of your bot - https://discordapp.com/developers/applications/me
const token = config.discord_bot_token;

// Establish database connection
var connection = mysql.createConnection({
  host     : config.db_host,
  user     : config.db_username,
  password : config.db_password,
  database : config.db_database
});
connection.connect(function(err) {
  if (err) {
    console.log("Error connecting to database.");
    process.exit();
  }
});

// Create an instance of a Discord client
const client = new Discord.Client();

// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
  log("Dudebot online.");
});

// Create an event listener for messages
client.on('message', message => {
  store_message(message);
  log(box_str_l(channel_name(message.channel)) + "\t" + box_str_l(message.author.username) + "\t" + message.content);
  if (is_mine(message)) return;
  if (bot_command(message)) return;
  bot_meme(message);
});

// Log our bot in
client.login(token);

var commands = {
  '!help': function (message) {
    message.channel.send(Object.keys(commands).join("\t"));
  },
  '!ping': function (message) {
    message.channel.send(rand_caps('pong'));
  },
  '!markov': async function (message) {
    var str = await markov();
    message.channel.send(strip_notifies(str));
  },
  '!bitcoin': function (message) {
    var url = 'https://api.coindesk.com/v1/bpi/currentprice.json';
    got(url)
      .then(response => {
	var data = JSON.parse(response.body);
        message.channel.send(
          "BTC\t$" + data.bpi.USD.rate_float
        );
      })
      .catch(error => {
        log("Command failed. " + error);
      });
  },
  '!stats': async function (message) {
    var channel_id = await get_channel(message.channel);
    var sql = "SELECT u.`username`, COUNT(*) AS `num`, m.`content` "
      + " FROM `messages` m "
      + " LEFT JOIN `users` u ON m.`user_id` = u.`id` "
      + " WHERE m.`channel_id` = " + connection.escape(channel_id)
      + " AND m.`at` > (NOW() - INTERVAL 1 DAY) "
      + " GROUP BY m.`user_id` "
      + " ORDER BY `num` DESC ";
    var results = await query(sql);
    var str = '';
    str += "Stats for last 1 day:\n";
    str += "```\n";
    str += trim_pad_r('username', 20) + "\t" + trim_pad_r('# msgs', 6) + "\t" + 'example' + "\n";
    str += trim_pad_r('--------', 20) + "\t" + trim_pad_r('------', 6) + "\t" + '-------' + "\n";
    for (var i = 0; i < results.length; i++) {
      str += trim_pad_r(results[i].username, 20) + "\t" + trim_pad_r(results[i].num, 6) + "\t" + results[i].content + "\n";
    }
    str += "```";
    message.channel.send(str);
  },
  '!translate.*': async function (message) {
    var msg = message.content.trim().replace(/^!translate\s*/i, '');
    var sql = "SELECT * FROM `memes`";
    var results = await query(sql);
    var str = msg;
    for (var i = 0; i < results.length; i++) {
      var re = new RegExp(results[i].regex, 'gi');
      var matches = msg.match(re);
      str = str.replace(re, results[i].content);
    }
    if (str.length) {
      message.channel.send(str);
    }
  }
};

function bot_command(message)
{
  var msg = message.content.trim();
  for (var command in commands) {
    var re = new RegExp(command, 'i');
    if (msg.match(re)) {
      commands[command](message);
      log("Command: " + message);
      return true;
    }
  }
  return false;
}

class Meme
{
  constructor(callback, enabled = true, min_cooldown = 300, max_cooldown = 1800)
  {
    this.callback = callback;
    this.enabled = enabled;
    this.min_cooldown = min_cooldown;
    this.max_cooldown = max_cooldown;
    this.last = null;
    this.cooldown = null;
    this.touch();
  }

  ready()
  {
    if (!this.enabled) {
      return false;
    }
    if (!this.cooldown) {
      return false;
    }
    var now = ts();
    if (this.last === null || (now - this.last) > this.cooldown) {
      return true;
    }
    return false;
  }

  touch()
  {
    var now = ts();
    this.last = now;
    this.cooldown = rand_int(this.min_cooldown, this.max_cooldown);
  }
}

var memes = {
  'markov': new Meme(async function (message) {
    var str = await markov();
    send_delay(message.channel, str);
    return true;
  }, true),
  'quote': new Meme(function (message) {
    var parts = remove_short(message.content.split(/\s+/));
    if (parts.length < 3) {
      return false;
    }
    send_delay(message.channel, '"' + rand_elem(parts) + '"')
    return true;
  }, false),
  'uclast': new Meme(function (message) {
    var parts = remove_short(message.content.split(/\s+/));
    if (!parts.length) {
      return false;
    }
    send_delay(message.channel, uclast(rand_elem(parts).toLowerCase()));
    return true;
  }, false),
  'sss': new Meme(function (message) {
    if (message.content.match(/^ssss+$/)) {
      send_delay(message.channel, message.content + 's');
      return true;
    }
    return false;
  }, false),
  'question': new Meme(function (message) {
    if (message.content.match(/\?$/)) {
      send_delay(message.channel, '...?');
      return true;
    }
    return false;
  }, false)
};

function remove_short(arr)
{
  var newarr = [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].length < 3) {
      continue;
    }
    if (['the', 'and', 'but', 'nor', 'for',
      'than', 'then', 'have', 'had', 'that',
      'who', 'what', 'when', 'where', 'why',
      'with', 'how', 'can'].includes(arr[i])) {
      continue;
    }
    newarr.push(arr[i]);
  }
  return newarr;
}

async function bot_meme(message)
{
  if (channel_name(message.channel) != 'dudechat') {
    return false;
  }
  var active = await is_channel_active(message.channel);
  if (!active) {
    return false;
  }
  var now = ts();
  var memed = false;
  for (var key in memes) {
    var meme = memes[key];
    if (meme.ready()) {
      log("Meme: " + key);
      if (meme.callback(message)) {
        memed = true;
        break;
      }
    }
  }
  if (memed) {
    for (var key in memes) {
      memes[key].touch();
    }
  }
  return memed;
}

function send_delay(channel, str, min = 1000, max = 10000)
{
  setTimeout(function () {
    channel.send(strip_notifies(str));
  }, rand_int(min, max));
}

function strip_notifies(str) {
  return str.replace(/@(\S)/g, '@ $1')
}

function rand_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ucfirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function uclast(str) {
  return str.slice(0, -1) + str.charAt(str.length - 1).toUpperCase();
}

function is_mine(message)
{
  if (message.author.id == client.user.id) {
    return true;
  }
  return false;
}

function ts()
{
  return Math.round(new Date().getTime() / 1000);
}

function log(str) {
  console.log(date_time_str() + "\t" + str);
}

function date_time_str()
{
  return new Date().toISOString()
    .replace(/T/, ' ')
    .replace(/\..+/, '')
}

function box_str_l(str, size = 10)
{
  str = String(str);
  return '[' + trim_pad_l(str, size) + ']'
}

function box_str_r(str, size = 10)
{
  str = String(str);
  return '[' + trim_pad_r(str, size) + ']'
}

function trim_pad_l(str, size = 10)
{
  str = String(str);
  return str.substr(0, size) + ' '.repeat(Math.max(0, size - str.length));
}

function trim_pad_r(str, size = 10)
{
  str = String(str);
  return ' '.repeat(Math.max(0, size - str.length)) + str.substr(0, size);
}

function add_sign(num)
{
  if (num > 0) {
    return '+' + num;
  }
  return num;
}

function rand_elem(arr)
{
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand_caps(str)
{
  return str.split('').map(letter => rand_cap(letter)).join('');
}

async function markov(str) {
  const { stdout, stderr } = await exec('python markov.py');
  return stdout;
}

function rand_cap(letter)
{
  return Math.round(Math.random()) === 1 ? letter.toUpperCase() : letter;
}

function channel_name(channel)
{
  switch (channel.type) {
    case 'text':
      return channel.name;
    case 'voice':
    case 'dm':
    case 'group':
    default:
      return channel.id;
  }
}

// db

function query(sql)
{
  return new Promise((resolve, reject) => {
    connection.query(sql, function (error, results) {
      if (error) reject(error);
      resolve(results);
    });
  })
}

async function store_message(message)
{
  var channel_id = await save_channel(message.channel);
  var user_id = await save_user(message.author);
  save_message(message, channel_id, user_id);
}

async function save_message(message, channel_id, user_id)
{
  await query("INSERT IGNORE INTO `messages` SET `uuid` = " + connection.escape(message.id));
  await query("UPDATE `messages` SET "
    + "`channel_id` = " + connection.escape(channel_id) + ", "
    + "`user_id` = " + connection.escape(user_id) + ", "
    + "`content` = " + connection.escape(message.content) + " "
    + "WHERE `uuid` = " + connection.escape(message.id));
  var results = await query("SELECT * FROM `messages` WHERE `uuid` = " + connection.escape(message.id));
  return results[0].id;
}

async function save_channel(channel)
{
  await query("INSERT IGNORE INTO `channels` SET `uuid` = " + connection.escape(channel.id));
  await query("UPDATE `channels` SET "
    + "`type` = " + connection.escape(channel.type) + ", "
    + "`name` = " + (channel.type == 'text' ? connection.escape(channel.name) : 'NULL') + " "
    + "WHERE `uuid` = " + connection.escape(channel.id));
  var results = await query("SELECT * FROM `channels` WHERE `uuid` = " + connection.escape(channel.id));
  return results[0].id;
}

async function get_channel(channel)
{
  var results = await query("SELECT `id` FROM `channels` WHERE `uuid` = " + connection.escape(channel.id));
  return results[0].id;
}

async function save_user(user)
{
  await query("INSERT IGNORE INTO `users` SET `uuid` = " + connection.escape(user.id));
  await query("UPDATE `users` SET "
    + "`username` = " + connection.escape(user.username) + " "
    + "WHERE `uuid` = " + connection.escape(user.id));
  var results = await query("SELECT * FROM `users` WHERE `uuid` = " + connection.escape(user.id));
  return results[0].id;
}

async function is_channel_active(channel, num_messages = 5, num_seconds = 240)
{
  var results = await query("SELECT `id` FROM `channels` WHERE `uuid` = " + connection.escape(channel.id));
  var channel_id = results[0].id;
  var sql = "SELECT COUNT(*) AS `num` FROM `messages` "
    + "WHERE `channel_id` = " + connection.escape(channel_id) + " "
    + "AND `at` > (NOW() - INTERVAL " + num_seconds + " SECOND)";
  var results = await query(sql);
  if (results[0].num >= num_messages) {
    return true;
  }
  return false;
}
