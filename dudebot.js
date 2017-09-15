const Discord = require('discord.js');
const got = require('got');
const fs = require('fs');

// Create an instance of a Discord client
const client = new Discord.Client();

// The token of your bot - https://discordapp.com/developers/applications/me
const token_file = 'token.txt';
if (!fs.existsSync(token_file)) {
  console.log("Please create file '" + token_file + "' and populate it with your bot token. See https://discordapp.com/developers/applications/me");
}
const token = fs.readFileSync(token_file, 'utf8').trim();

// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
  log("Dudebot online.");
});

// Create an event listener for messages
client.on('message', message => {
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
  '!bitcoin': function (message) {
    var url = 'https://api.coinmarketcap.com/v1/ticker/bitcoin/';
    got(url)
      .then(response => {
        var data = JSON.parse(response.body)[0];
        message.channel.send(
          data.symbol
          + "\t$" + data.price_usd
          + "\t(1h " + add_sign(data.percent_change_1h) + "%)"
          + "\t(24h " + add_sign(data.percent_change_24h) + "%)"
          + "\t(7d " + add_sign(data.percent_change_7d) + "%)"
        );
      })
      .catch(error => {
        log("Command failed. " + error.response.body);
      });
  }
};

function bot_command(message)
{
  var cmd = message.content.trim();
  if (cmd in commands) {
    commands[cmd](message);
    log("Command: " + message);
    return true;
  }
  return false;
}

var memes = {
  'quote': {
    cooldown: null,
    min_cooldown: 60,
    max_cooldown: 1200,
    last: null,
    callback: function (message) {
      var parts = message.content.split(/\s+/);
      if (parts.length < 3) {
        return false;
      }
      message.channel.send('"' + rand_elem(parts) + '"');
      return true;
    }
  },
  'uclast': {
    cooldown: null,
    min_cooldown: 60,
    max_cooldown: 1200,
    last: null,
    callback: function (message) {
      var parts = message.content.split(/\s+/);
      if (!parts.length) {
        return false;
      }
      message.channel.send(uclast(rand_elem(parts).toLowerCase()));
      return true;
    }
  }
};

// Set random meme cooldowns within bounds
for (var key in memes) {
  var meme = memes[key];
  meme.cooldown = rand_int(meme.min_cooldown, meme.max_cooldown);
  meme.last = ts();
}

function bot_meme(message)
{
  if (channel_name(message.channel) != 'dudechat') {
    return false;
  }
  var now = ts();
  for (var key in memes) {
    var meme = memes[key];
    if (!meme.cooldown) {
      continue;
    }
    if (meme.last === null || now - meme.last > meme.cooldown) {
      if (meme.callback(message)) {
        log("Meme: " + key);
        meme.last = now;
        meme.cooldown = rand_int(meme.min_cooldown, meme.max_cooldown);
        return true;
      }
    }
  }
  return false;
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
  return '[' + trim_pad_l(str, size) + ']'
}

function box_str_r(str, size = 10)
{
  return '[' + trim_pad_r(str, size) + ']'
}

function trim_pad_l(str, size = 10)
{
  return str.substr(0, size) + ' '.repeat(Math.max(0, size - str.length));
}

function trim_pad_r(str, size = 10)
{
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
