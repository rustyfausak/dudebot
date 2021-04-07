const mysql = require('mysql');

module.exports = class DudebotDB {
	constructor(host, username, password, database, port) {
		this.host = host;
		this.username = username;
		this.password = password;
		this.database = database;
		this.port = port;
		this.connection = null
		this.init();
	}

	init() {
		this.connection = mysql.createConnection({
			host     : this.host,
			user     : this.username,
			password : this.password,
			database : this.database,
			port     : this.port
		});
		this.connection.connect(function(err) {
			if (err) {
				console.log(err);
				console.log("Error: Could not connect to the database.");
				process.exit();
			}
		});
	}

	query(sql) {
		return new Promise((resolve, reject) => {
			this.connection.query(sql, function (error, results) {
				if (error) reject(error);
				resolve(results);
			});
		});
	}

	e(str) {
		return this.connection.escape(str);
	}

	async getNextSendQueueRow() {
		var results = await this.query(
			"SELECT sq.*, c.`uuid` AS `channel_uuid` FROM `send_queue` sq "
			+ "LEFT JOIN `channels` c ON sq.`channel_id` = c.`id` "
			+ "WHERE `is_sent` = FALSE LIMIT 1"
		);
		if (results.length) {
			return results[0];
		}
		return null;
	}

	async setSendQueueSent(id) {
		await this.query(
			"UPDATE `send_queue` SET `is_sent` = TRUE WHERE `id` = " + this.e(id)
		);
	}

	async saveMessage(message) {
		var channel_id = await this.saveChannel(message.channel);
		var user_id = await this.saveUser(message.author);
		this._saveMessage(message, channel_id, user_id);
	}

	async _saveMessage(message, channel_id, user_id) {
		await this.query(
			"INSERT IGNORE INTO `messages` SET `uuid` = " + this.e(message.id)
		);
		await this.query(
			"UPDATE `messages` SET "
			+ "`channel_id` = " + this.e(channel_id) + ", "
			+ "`user_id` = " + this.e(user_id) + ", "
			+ "`content` = " + this.e(message.content) + " "
			+ "WHERE `uuid` = " + this.e(message.id)
		);
		var results = await this.query(
			"SELECT `id` FROM `messages` WHERE `uuid` = " + this.e(message.id)
		);
		return results[0].id;
	}

	async saveChannel(channel) {
		await this.query(
			"INSERT IGNORE INTO `channels` SET `uuid` = " + this.e(channel.id)
		);
		await this.query(
			"UPDATE `channels` SET "
			+ "`type` = " + this.e(channel.type) + ", "
			+ "`name` = " + (channel.type == 'text' ? this.e(channel.name) : 'NULL') + " "
			+ "WHERE `uuid` = " + this.e(channel.id)
		);
		var results = await this.query(
			"SELECT `id` FROM `channels` WHERE `uuid` = " + this.e(channel.id)
		);
		return results[0].id;
	}

	async saveUser(user) {
		await this.query(
			"INSERT IGNORE INTO `users` SET `uuid` = " + this.e(user.id)
		);
		await this.query(
			"UPDATE `users` SET "
			+ "`username` = " + this.e(user.username) + " "
			+ "WHERE `uuid` = " + this.e(user.id)
		);
		var results = await this.query(
			"SELECT `id` FROM `users` WHERE `uuid` = " + this.e(user.id)
		);
		return results[0].id;
	}

	async numMessages(channel, num_seconds = 240)
	{
		var results = await this.query(
			"SELECT `id` FROM `channels` WHERE `uuid` = " + this.e(channel.id)
		);
		var channel_id = results[0].id;
		var results = await this.query(
			"SELECT COUNT(*) AS `num` FROM `messages` "
			+ "WHERE `channel_id` = " + this.e(channel_id) + " "
			+ "AND `at` > (NOW() - INTERVAL " + num_seconds + " SECOND)"
		);
		return results[0].num;
	}

};
