const API = require('../utils/api');
const mysql = require('mysql');
const config = require('config');
const child_process = require('child_process');

class DatabaseSchema extends API {

	async get({db = 'main'} = {}) {

		this.assert(config.has('compare_schema') && config.get('compare_schema').local, 'Configuration property "compare_schema" not set');

		const
			connectionObj = config.get('compare_schema').local,
			database = db == 'main' ? connectionObj.database : connectionObj.database.concat('_logs'),
			schema = child_process.execSync(`mysqldump -u${connectionObj.user} -p${connectionObj.password} -h${connectionObj.host} ${database} --single-transaction --no-data --skip-comments --skip-set-charset --compact`)
				.toString()
				.replace(/\/\*.*;/g, '')
				.replace(/AUTO_INCREMENT=.*DEFAULT/g,'DEFAULT')
				.trim()
		;

		if(db != 'main') {

			return schema;
		}

		const metadata = child_process.execSync(`mysqldump -u${connectionObj.user} -p${connectionObj.password} -h${connectionObj.host} ${database} tb_features tb_visualizations tb_datasources --skip-comments --compact`)
			.toString()
			.replace(/\/\*.*;/g, '')
			.replace(/AUTO_INCREMENT=.*DEFAULT/g,'DEFAULT')
			.trim();

		let insert_syntax = metadata.match(/INSERT INTO .*;/g);

		insert_syntax = insert_syntax.map(x => x.split('),').join('),\n'));

		return schema.concat('\n\n', insert_syntax.join('\n\n'));
	}
}

exports.get = DatabaseSchema;