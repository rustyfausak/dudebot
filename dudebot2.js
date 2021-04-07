const Discord = require('discord.js');
const client = new Discord.Client();
const util = require('util');
const fs = require('fs');
const mysql = require('mysql');
const DudebotDB = require('./DudebotDB.js');
const DudebotCommandManager = require('./DudebotCommandManager.js');
const DudebotHelpers = require('./DudebotHelpers.js');

var config = DudebotHelpers.loadConfig('config.json');
var db = new DudebotDB(
	config.db_host,
	config.db_username,
	config.db_password,
	config.db_database,
	config.db_port
);
var command_manager = new DudebotCommandManager(db, config);

client.on('ready', () => {
	console.log("Logged in as '" + client.user.tag + "'.");

	// Initialize interval for send queue
	client.setInterval(() => {
		db.getNextSendQueueRow().then(row => {
			if (!row) {
				return;
			}
			client.channels.fetch(row.channel_uuid).then(async channel => {
				console.log("Sending message from queue.");
				await channel.send(row.content);
				db.setSendQueueSent(row.id);
			});
		});
	}, 1000);
});

// Handle message receives
client.on('message', message => {
	if (message.author.id == client.user.id) {
		// We sent this message
		return;
	}

	if (message.channel.type != 'text') {
		// This message is not in a normal text channel
		//return;
	}

	// Print message to console
	DudebotHelpers.outputMessage(message);

	if (command_manager.handle(message)) {
		// The message was a command
		return;
	}

	// Save the message to the database
	db.saveMessage(message);
});

client.login(config.discord_bot_token);
