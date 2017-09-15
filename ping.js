/*
  A ping pong bot, whenever you send "ping", it replies "pong".
*/

// Import the discord.js module
const Discord = require('discord.js');

const got = require('got');

fs = require('fs');

// Create an instance of a Discord client
const client = new Discord.Client();

// The token of your bot - https://discordapp.com/developers/applications/me

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

function command(message)
{
  if (_command(message)) {
    log("Command: " + message);
  }
}

var commands = [
  '!help',
  '!ping',
  '!bitcoin',
];

function _command(message)
{
  var cmd = message.content.trim();
  switch (cmd) {
    case '!help':
      message.channel.send(commands.join("\t"));
      return true;
    case '!ping':
      message.channel.send(rand_caps('pong'));
      return true;
    case '!bitcoin':
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
      return true;
  }
  return false;
}

function cmd_bitcoin(message)
{

}

// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
  log("Dudebot online.");
});

// Create an event listener for messages
client.on('message', message => {
  log(box_str_l(channel_name(message.channel)) + "\t" + box_str_l(message.author.username) + "\t" + message.content);
  command(message);
});

// Log our bot in
client.login(token);
