const fs = require('fs');

module.exports = class DudebotHelpers {

	// Parse the JSON config file and return it as an object.
	static loadConfig(filepath) {
		if (!fs.existsSync(filepath)) {
			console.log("Error: File '" + filepath + "' does not exist.");
			process.exit();
		}
		return JSON.parse(fs.readFileSync(filepath, 'utf8'));
	}

	static outputMessage(message) {
		console.log('[MSG] #' + this.getChannelName(message) + ' <' + message.author.username + '> ' + message.content);
	}

	static getChannelName(message) {
		switch (message.channel.type) {
			case 'text':
				return message.channel.name;
			case 'dm':
				return '<DM>';
		}
		return '@' + message.channel.id;
	}

	static stripNotifies(str) {
		return str.replace(/@(\S)/g, '@ $1')
	}

	static signedNum(num) {
		return (num >= 0 ? '+' : '') + num;
	}
};
