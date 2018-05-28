const API = require('../utils/api');

exports.hello = class extends API {

	async hello() {

		return await this.mysql.query('SELECT 1');
	}
}