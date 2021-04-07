const DudebotHelpers = require('./DudebotHelpers.js');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const rp = require('request-promise');

module.exports = class DudebotCommandManager {
	constructor(db, config) {
		this.db = db;
		this.config = config;
		this.coins_cache = {
			expires_in_sec: 260,
			at: null,
			response: null
		};
		this.testat = null;
		this.commands = {
			'!help': this.command_help,
			'!ping': this.command_ping,
			'!markov': this.command_markov,
			'!bitcoin': this.command_bitcoin,
			'!coin': this.command_coin,
			'!coins': this.command_coins,
		};
	}

	handle(message) {
		var content = message.content.trim();
		for (var command in this.commands) {
			var re = new RegExp(command + "\\b", 'i');
			if (content.match(re)) {
				console.log("[BOT] Command: " + command);
				this.commands[command].call(this, message);
				return true;
			}
		}
		return false;
	}

	command_help(message) {
		message.channel.send(Object.keys(this.commands).join("\t"));
	}

	command_ping(message) {
		message.channel.send('pong');
	}

	command_markov(message) {
		this.db.saveChannel(message.channel).then((channel_id) => {
			exec('python markov.py ' + channel_id).then((result) => {
				if (result.stdout === undefined || result.stdout === '') {
					message.channel.send("Sorry I couldn't generate a Markov text right now. Try again after more messages are sent in this channel.");
					return;
				}
				message.channel.send(DudebotHelpers.stripNotifies(result.stdout));
			});
		});
	}

	command_coin(message) {
		var type = message.content.trim().replace(/^!.+?\s+/i, '').trim();
		this.get_coin_output(type).then((output) => {
			message.channel.send(output);
		});
	}

	command_bitcoin(message) {
		this.get_coin_output('btc').then((output) => {
			message.channel.send(output);
		});
	}

	async get_coin_output(type) {
		type = type.toUpperCase();

		if (this.coins_should_refresh()) {
			await this.coins_refresh();
		}
		if (!this.coins_cache.response) {
			return "API error";
		}
		for (var key in this.coins_cache.response.data) {
			var coin = this.coins_cache.response.data[key];
			if (
				coin.name.toUpperCase() == type
				|| coin.symbol.toUpperCase() == type
				|| coin.slug.toUpperCase() == type
			) {
				return coin.name + " (" + coin.symbol + ")\t$ " + coin.quote.USD.price.toFixed(2)
					+ "\t(" + DudebotHelpers.signedNum(coin.quote.USD.percent_change_1h.toFixed(1)) + "% 1HR)"
					+ " (" + DudebotHelpers.signedNum(coin.quote.USD.percent_change_24h.toFixed(1)) + "% 24HR)"
					+ " (" + DudebotHelpers.signedNum(coin.quote.USD.percent_change_7d.toFixed(1)) + "% 7D)"
					+ " (" + DudebotHelpers.signedNum(coin.quote.USD.percent_change_30d.toFixed(1)) + "% 30D)"
					;
			}
		}
		return "Coin '" + type + "' not found";
	}

	command_coins(message) {
		this.get_coins_output().then((output) => {
			message.channel.send(output);
		});
	}

	async get_coins_output() {
		if (this.coins_should_refresh()) {
			await this.coins_refresh();
		}
		if (!this.coins_cache.response) {
			return "API error";
		}
		var output = '';
		for (var key in this.coins_cache.response.data) {
			var coin = this.coins_cache.response.data[key];
			output += coin.name + " (" + coin.symbol + ")\t";
		}
		return output;
	}

	coins_should_refresh() {
		if (!this.coins_cache.at) {
			return true;
		}
		else {
			if (this.coins_cache.at < new Date(Date.now() - (this.coins_cache.expires_in_sec * 1000))) {
				return true;
			}
		}
		return false;
	}

	coins_refresh() {
		const requestOptions = {
			method: 'GET',
			uri: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
			qs: {
				'start': '1',
				'limit': '25',
				'convert': 'USD'
			},
			headers: {
				'X-CMC_PRO_API_KEY': this.config.coinmarketcap_api_key
			},
			json: true,
			gzip: true
		};
		return rp(requestOptions).then(response => {
			this.coins_cache.response = response;
			this.coins_cache.at = new Date(Date.now());
		}).catch((err) => {
			console.log("[BOT] API call error: ", err.message);
			this.coins_cache.at = new Date(Date.now());
		});
	}
};
