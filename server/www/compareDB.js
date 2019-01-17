const API = require('../utils/api');
const mysql = require('mysql');
const Config = require('config');

exports.compareDatabases = class extends API {

	async compareDatabases() {

		let connections = {};

		if(Config.has("compare_schema")) {
			connections = Config.get("compare_schema");
		}
		else {
			throw 'Databases not present in Config';
		}

		const remoteConnection = await mysql.createConnection(connections.remote);
		const localConnection = await mysql.createConnection(connections.local);

		remoteConnection.connect(error => {

			if(error) {
				throw error;
			}
		});

		localConnection.connect(error => {

			if(error) {
				throw error;
			}
		});

		const query = `
			SELECT
				table_name as table_name,
				column_name as column_name,
				column_type as column_type,
				column_default as column_default,
				column_key as column_key,
				extra as extra,
				character_set_name as character_set_name,
				is_nullable as is_nullable

			FROM
				information_schema.columns
			WHERE table_schema = ?
		`;

		const remoteResult = await new Promise((resolve, reject) => {

			remoteConnection.query(query, [connections.remote.database], (error, response) => {

				if (error) {
					return reject(error);
				}

				return resolve(response);
			});
		});

		const localResult = await new Promise((resolve, reject) => {

			localConnection.query(query, [connections.local.database], (error, response) => {

				if (error) {
					return reject(error);
				}

				return resolve(response)
			});
		});

		const table_not_found = new Map;
		const column_not_found = new Map;
		const column_value_changed = new Map;
		const remoteMap = new Map;
		const localMap = new Map;

		for(const row of remoteResult) {

			if(!remoteMap.has(row.table_name))
				remoteMap.set(row.table_name, new Map);

			remoteMap.get(row.table_name).set(row.column_name, row);
		}

		for(const row of localResult) {

			if(!localMap.has(row.table_name))
				localMap.set(row.table_name, new Map);

			localMap.get(row.table_name).set(row.column_name, row);
		}

		for(const [key, value] of remoteMap) {

			if(!localMap.get(key)) {
				table_not_found.set(key, value);
				continue;
			}

			const columns = localMap.get(key);

			for(const [_key, _value] of value) {

				if(!columns.has(_key)) {
					column_not_found.set(`${key}.${_key}`, _value);
					continue;
				}

				const column_value = columns.get(_key);

				for(const type in _value) {

					if(_value[type] != column_value[type]) {

						column_value_changed.set(`${key}.${_key}`, {
							table_name: _value.table_name,
							column_changed: _value.column_name,
							key_changed: type,
							current_value: column_value[type],
							updated_value: _value[type]
						});
					}
				}
			}
		}

		const final_result = {
			table_not_found: [],
			column_not_found: [],
			column_value_changed: [],
		}

		for(const [key,data] of table_not_found) {
			final_result.table_not_found.push(key);
		}

		for(const [key, data] of column_not_found) {
			final_result.column_not_found.push(data);
		}

		for(const [key, data] of column_value_changed) {
			final_result.column_value_changed.push(data);
		}

		return final_result;
	}
}