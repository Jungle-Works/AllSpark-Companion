"use strict";

const mysql = require('mysql');
const dbConfig = require('config').get("sql_db");

console.log('INITIALIZE POOL###################################');


const poolObj = {};

for (const connection in dbConfig) {
	poolObj[connection] = mysql.createPool(dbConfig[connection])
}


class MySQL {
	constructor(connectionName = 'read') {
		this.pool = poolObj[connectionName || 'read'] || poolObj['read'];
	}

	async query(sql, values = null, connectionName = 'read') {
		this.pool = poolObj[connectionName];

		return new Promise((resolve, reject) => {

			const q = this.pool.query(sql, values, function (err, result) {

				if (err) {
					console.log(err);
					return reject(err);
				}

				if (!result.hasOwnProperty('length')) {
					return resolve(result);
				}

				this.formatted_sql = q.sql;
				this.sql = q.sql.replace(/\n/g, ' ');
				this.result = result;
				result.instance = this;
				return resolve(result);
			});
		});
	}

}

exports.MySQL = (() => new MySQL)();

