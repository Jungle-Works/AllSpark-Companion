"use strict";

const express = require('express');
const router = express.Router();
const API = require('../server/utils/api');

router.use(express.static('./client'));

class HTMLAPI extends API {

	constructor(request, response) {

		super();

		this.request = request;
		this.response = response;

		this.stylesheets = [
			'/css/main.css',
		];

		this.scripts = [
			'/js/main.js',
		];
	}

	async body() {

		return `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<title></title>

					${this.stylesheets.map(s => '<link rel="stylesheet" type="text/css" href="' + s + '?' + this.checksum + '">').join('')}
					${this.scripts.map(s => '<script src="' + s + '?' + this.checksum + '"></script>').join('')}
				</head>
				<body>
					<div id="ajax-working"></div>
					<div class="nav-blanket"></div>
					<main>
						${await this.main() || ''}
					</main>
				</body>
			</html>
		`;
	}
}

router.get('/hello-world', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/hello-world.css');
		this.scripts.push('/js/hello-world.js');
	}

	async main() {

		return 'Hello World';
	}
}));


module.exports = router;