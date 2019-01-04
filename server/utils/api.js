const zlib = require('zlib');
const mysql = require('./mysql').MySQL;
const fs = require('fs');
const crypto = require('crypto');
const pathSeparator = require('path').sep;
const {resolve} = require('path');
const commonFun = require('./commonFunctions');
const assert = require("assert");

const environment = {
	name: process.env.NODE_ENV,
	deployed_on: new Date(),
	gitChecksum: child_process.execSync('git rev-parse --short HEAD').toString().trim(),
	branch: child_process.execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
};

class API {

	constructor() {

		this.mysql = mysql;
		this.environment = environment;
	}

	static setup() {

		API.endpoints = new Map;

		function walk(directory) {

			for (const file of fs.readdirSync(directory)) {

				const path = resolve(directory, file).replace(/\//g, pathSeparator);

				if (fs.statSync(path).isDirectory()) {
					walk(path);
					continue;
				}

				if (!path.endsWith('.js'))
					continue;

				const module = require(path);

				for (const key in module) {

					// Make sure the endpoint extends API class
					if (module.hasOwnProperty(key) && module[key] && module[key].prototype && module[key].prototype.__proto__.constructor == API)
						API.endpoints.set([path.slice(0, -3), key].join(pathSeparator), module[key]);
				}
			}
		}

		walk(__dirname + '/../www');
	}

	static serve(clientEndpoint) {

		return async function (request, response, next) {

			let obj;

			try {

				const
					url = request.url.replace(/\//g, pathSeparator),
					path = resolve(__dirname + '/../www') + pathSeparator + url.substring(4, url.indexOf('?') < 0 ? undefined : url.indexOf('?'));

				if (!API.endpoints.has(path) && !clientEndpoint) {

					return next();
				}

				let endpoint = clientEndpoint || API.endpoints.get(path);

				obj = new endpoint();

				obj.request = request;
				obj.response = response;

				obj.checksum = environment.gitChecksum;

				if (clientEndpoint) {
					return response.send(await obj.body());
				}

				const params = {...request.query, ...request.body};
				const result = await obj[path.split(pathSeparator).pop()](params);

				obj.result = {
					status: result ? true : false,
					data: result,
				};

				await obj.gzip();

				response.set({'Content-Encoding': 'gzip'});
				response.set({'Content-Type': 'application/json'});

				response.send(obj.result);
			}

			catch (e) {

				if(e.pass) {
					return;
				}

				if (e instanceof API.Exception) {

					return response.status(e.status || 500).send({
						status: false,
						message: e.message,
					});
				}

				if (!(e instanceof Error)) {

					e = new Error(e);
					e.status = 401;
				}

				if (e instanceof assert.AssertionError) {

					if (commonFun.isJson(e.message)) {
						e.message = JSON.parse(e.message);
					}
					e.status = e.message.status || 400;
					e.message = e.message.message || (typeof e.message === typeof "string" ? e.message : "Something went wrong! :(");
				}

				else {
					e.status = e.status || 500;
				}

				return next(e);
			}
		}
	}

	async gzip() {

		return new Promise((resolve, reject) => {
			zlib.gzip(JSON.stringify(this.result), (error, result) => {

				if (error)
					reject(['API response gzip compression failed!', error]);

				else {
					this.result = result;
					resolve();
				}
			});
		});
	}

	assert(expression, message, statusCode) {

		return assert(expression,
			JSON.stringify({
				message: message,
				status: statusCode,
			}));
	}
}

API.Exception = class {

	constructor(status, message) {
		this.status = status;
		this.message = message;

		console.error("API Exception Error!!!!", this);
		console.trace();
	}
}

module.exports = API;
API.setup();