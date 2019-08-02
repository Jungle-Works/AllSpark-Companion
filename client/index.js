"use strict";

const express = require('express');
const router = express.Router();
const API = require('../server/utils/api');
const constants = require('../server/utils/constants');
const config = require('config');

router.use(express.static('./client'));

class HTMLAPI extends API {

	constructor(request, response) {

		super();

		this.request = request;
		this.response = response;

		this.stylesheets = [
			'css/main.css',
			'https://use.fontawesome.com/releases/v5.2.0/css/all.css" integrity="sha384-hWVjflwFxL6sNzntih27bfxkr27PmbbK/iSvJ+a4+0owXq79v+lsFkW54bOGbiDQ" crossorigin="anonymous" f="'
		];

		this.scripts = [
			'js/main.js',
			'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ace.js',
		];
	}

	async body() {

		return `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<base href="${constants.base_url}/">
					<title></title>

					${this.stylesheets.map(s => '<link rel="stylesheet" type="text/css" href="' + s + '?' + this.checksum + '">').join('')}
					${this.scripts.map(s => '<script src="' + s + '?' + this.checksum + '"></script>').join('')}
					<script>
						const base_url = "${constants.base_url}";
					</script>
				</head>
				<body>
					<div id="ajax-working"></div>

					<header>
						<h1>${this.environment.name}</h1>
						<div id="info">
							${this.environment.branch}
							<span title="${this.environment.deployed_on}" id="deployed_on">${this.environment.deployed_on.toISOString()}</span>
						</div>
					</header>

					<nav>
						<a href="/allspark"><i class="fas fa-home"></i> Home</a>
						<a href="/allspark/compare-schema"><i class="fas fa-exchange-alt"></i> Compare Schema</a>
						<a href="/allspark/get-schema"><i class="fas fa-database"></i> Get Schema</a>
					</nav>

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

router.get('/', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('css/home.css');
		this.scripts.push('js/home.js');
	}

	async main() {

		return `
			<h1>Home</h1>
		`;
	}
}));

router.get('/compare-schema', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('css/compare-schema.css');
		this.scripts.push('js/compare-schema.js');
	}

	async main() {

		if(!config.has('compare_schema'))
			return 'Compare schema not defined';

		const connections = config.get('compare_schema');

		if(['production', 'staging'].includes(process.env.NODE_ENV))
			return 'You cannot run this on production or staging';

		return `
			<h1>Compare Schema</h1>

			<section class="compare-connections">

				<div class="block show-configs">

					<div class="remote">
						<span><h2>Remote</h2></span>
						<span></span>

						<span class="key">Host</span>
						<span class="value">${connections.remote.host}</span>

						<span class="key">Username</span>
						<span class="value">${connections.remote.user}</span>

						<span class="key">Database</span>
						<span class="value">${connections.remote.database}</span>

					</div>

					<div class="local">
						<span><h2>Local</h2></span>
						<span></span>

						<span class="key">Host</span>
						<span class="value">${connections.local.host}</span>

						<span class="key">Username</span>
						<span class="value">${connections.local.user}</span>
						
						<span class="key">Database</span>
						<span class="value">${connections.local.database}</span>

					</div>
				</div>

				<button class="get-diff">Load Diff</button>

				<div class="result hidden"></div>
			</section>
		`;
	}
}));

router.get('/get-schema',API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('css/get-schema.css');
		this.scripts.push('js/get-schema.js');
	}

	async main() {

		return '';
	}

}))


module.exports = router;