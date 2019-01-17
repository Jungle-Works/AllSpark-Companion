"use strict";

if(typeof window != 'undefined') {
	window.addEventListener('DOMContentLoaded', async () => {

		await Page.setup();

		if(!Page.class)
			return;

		window.page = new (Page.class)();
	});
}

class Page {

	static async setup() {

		AJAXLoader.setup();

		Page.render();
	}

	static render() {

		const deployed_on = document.body.querySelector('#deployed_on');

		deployed_on.textContent = Format.ago(deployed_on.textContent);
	}

	constructor() {

		this.container = document.querySelector('main');

		this.render();
	}

	render() {

		for(const menuItem of document.body.querySelectorAll('nav a')) {

			if(menuItem.href.split('/').filter(a => a).join('/') == window.location.href.split('/').filter(a => a).join('/'))
				menuItem.classList.add('selected');

		}
	}
}

Page.exception = class PageException extends Error {

	constructor(message) {
		super(message);
		this.message = message;
	}
}

class AJAX {

	static async call(url, parameters, options = {}) {

		AJAXLoader.show();

		parameters = new URLSearchParams(parameters);

		if(options.method == 'POST') {

			options.body = parameters.toString();

			options.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
			};
		}

		else
			url += '?' + parameters.toString();

		let response = null;

		try {
			response = await fetch(url, options);
		}
		catch(e) {
			AJAXLoader.hide();
			throw new API.Exception(e.status, 'API Execution Failed');
		}

		AJAXLoader.hide();

		if(response.status == 401)
			return User.logout();

		return await response.json();
	}
}

class API extends AJAX {

	/**
	 * Makes an API call.
	 *
	 * @param  string		endpoint	The endpoint to hit.
	 * @param  parameters	parameters	The api request paramters.
	 * @param  object		options		The options object.
	 * @return Promise					That resolves when the request is completed.
	 */
	static async call(endpoint, parameters = {}, options = {}) {

		// If a form id was supplied, then also load the data from that form
		if(options.form)
			API.loadFormData(parameters, options.form);

		endpoint = `${base_url}/api/v2/` + endpoint;

		const response = await AJAX.call(endpoint, parameters, options);

		if(response.status)
			return response.data;

		else
			throw new API.Exception(response);
	}

	/**
	 * This function takes a form id and loads all it's inputs data into the parameters object.
	 *
	 * We use FormData here instead of the a
	 * key/value pair object for two reasons:
	 *
	 * * It lets us pick up all form fields and
	 *	 values automatically without listing them
	 *	 here and worrying about conversions etc.
	 *
	 * * It lets us switch to the more advanced
	 *	 form/multipart Content-Type easily in the
	 *	 future, just comment out the later conversion.
	 *
	 * @param  object	parameters	The parameter list.
	 * @param  string	form		The id of the form whose elements will be picked.
	 */
	static loadFormData(parameters, form) {

		for(const key of form.keys()) {

			let value = form.get(key).trim();

			if(value && !isNaN(value))
				value = parseInt(value);

			parameters[key] = value;
		}
	}
}

API.Exception = class {

	constructor(response) {
		this.status = response.status;
		this.message = response.message;
	}
}

class AJAXLoader {

	static setup() {

		this.animateEllipses();

		setInterval(() => this.animateEllipses(), 500);
	}

	/**
	 * Show the working flag.
	 */
	static show() {

		if(typeof document == 'undefined')
			return;

		if(!AJAXLoader.count)
			AJAXLoader.count = 0;

		AJAXLoader.count++;

		const container = document.getElementById('ajax-working');

		// Because the container may not always be available
		if(!container)
			return;

		container.classList.add('show');
		container.classList.remove('hidden');

		if(AJAXLoader.timeout)
			clearTimeout(AJAXLoader.timeout);
	}

	/**
	 * Hide the flag.
	 */
	static hide() {

		if(typeof document == 'undefined')
			return;

		AJAXLoader.count--;

		const container = document.getElementById('ajax-working');

		// Because the container may not always be available or some other request me still be in progress.
		if(!container || AJAXLoader.count)
			return;

		container.classList.remove('show');

		AJAXLoader.timeout = setTimeout(() => container.classList.add('hidden'), 300);
	}

	static animateEllipses() {

		const container = document.getElementById('ajax-working');

		// Because the container may not always be available or some other request me still be in progress.
		if(!container || AJAXLoader.count)
			return;

		this.ellipsesDots = this.ellipsesDots < 3 ? this.ellipsesDots + 1 : 0;

		container.textContent = 'Working' + (new Array(this.ellipsesDots).fill('.').join(''));
	}
}

class Format {

	static ago(timestamp) {

		if(!timestamp)
			return '';

		const
			currentSeconds = typeof timestamp == 'number' ? timestamp : Date.parse(timestamp),
			agoFormat = [
				{
					unit: 60,
					minimum: 5,
					name: 'second',
				},
				{
					unit: 60,
					minimum: 1,
					name: 'minute',
				},
				{
					unit: 24,
					minimum: 1,
					name: 'hour',
					prefix: 'An',
				},
				{
					unit: 7,
					minimum: 1,
					name: 'day',
				},
				{
					unit: 4.3,
					minimum: 1,
					name: 'week',
				},
				{
					unit: 12,
					minimum: 1,
					name: 'month',
				},
				{
					name: 'year',
				},
			];

		//If the time is future.
		if(currentSeconds > Date.now())
			return '';

		//If the date is invalid;
		if(!currentSeconds)
			return 'Invalid Date';

		let
			time = Math.floor((Date.now() - currentSeconds) / 1000),
			finalString = '',
			format = agoFormat[0];

		for(const data of agoFormat) {

			//If the time format is year then break.
			if(agoFormat.indexOf(data) >= agoFormat.length - 1)
				break;

			format = data;

			format.time = time;

			time = Math.floor(time / format.unit);

			if(!time)
				break;
		}

		//Special case for year.
		const years = time % 12;

		if(years) {

			finalString = years == 1 ? 'A year ago' : Format.dateTime(timestamp);
		}
		else
			finalString = calculateAgo(format);


		function calculateAgo(format) {

			const
				range = format.unit - (0.15 * format.unit),
				time = format.time % format.unit,
				index = agoFormat.indexOf(format);

			let string = `${time} ${format.name}s ago`;

			if(time <= format.minimum)
				string = format.name.includes('second') ? 'Just Now' : `${format.prefix || 'A'} ${format.name} ago`;
			else if(time >= range) {

				let
					nextFormat = agoFormat[index + 1],
					prefix = nextFormat.prefix || 'a';

				string = `About ${prefix.toLowerCase()} ${nextFormat.name} ago`;
			}

			return string;
		}

		return finalString;
	}

	static date(date) {

		const options = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC',
		};

		if(!Format.date.formatter)
			Format.date.formatter = new Intl.DateTimeFormat(undefined, options);

		if(typeof date == 'string')
			date = Date.parse(date);

		if(typeof date == 'object' && date)
			date = date.getTime();

		if(!date)
			return '';

		return Format.date.formatter.format(date);
	}

	static month(month) {

		const options = {
			year: 'numeric',
			month: 'short',
			timeZone: 'UTC',
		};

		if(!Format.month.formatter)
			Format.month.formatter = new Intl.DateTimeFormat(undefined, options);

		if(typeof month == 'string')
			month = Date.parse(month);

		if(typeof month == 'object' && month)
			month = month.getTime();

		if(!month)
			return '';

		return Format.month.formatter.format(month);
	}

	static year(year) {

		const options = {
			year: 'numeric',
			timeZone: 'UTC',
		};

		if(!Format.year.formatter)
			Format.year.formatter = new Intl.DateTimeFormat(undefined, options);

		if(typeof year == 'string')
			year = Date.parse(year);

		if(typeof year == 'object' && year)
			year = year.getTime();

		if(!year)
			return '';

		return Format.year.formatter.format(year);
	}

	static time(time) {

		const options = {
			hour: 'numeric',
			minute: 'numeric'
		};

		if(!Format.time.formatter)
			Format.time.formatter = new Intl.DateTimeFormat(undefined, options);

		if(typeof time == 'string')
			time = Date.parse(time);

		if(typeof time == 'object' && time)
			time = time.getTime();

		if(!time)
			return '';

		return Format.time.formatter.format(time);
	}

	static customTime(time, format) {

		if(!Format.cachedFormat)
			Format.cachedFormat = [];

		let selectedFormat;

		for(const data of Format.cachedFormat) {

			if(JSON.stringify(data.format) == JSON.stringify(format))
				selectedFormat = data;
		}

		if(!selectedFormat) {

			selectedFormat = {
				format: format,
				formatter: new Intl.DateTimeFormat(undefined, format),
			};

			Format.cachedFormat.push(selectedFormat);
		}

		Format.customTime.formatter = selectedFormat.formatter;

		if(time && typeof time == 'string')
			time = Date.parse(time);

		if(time && typeof time == 'object')
			time = time.getTime();

		if(!time)
			return '';

		return Format.customTime.formatter.format(time);
	}

	static dateTime(dateTime) {

		const options = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric'
		};

		if(!Format.dateTime.formatter)
			Format.dateTime.formatter = new Intl.DateTimeFormat(undefined, options);

		if(typeof dateTime == 'string')
			dateTime = Date.parse(dateTime);

		if(typeof dateTime == 'object' && dateTime)
			dateTime = dateTime.getTime();

		if(!dateTime)
			return '';

		return Format.dateTime.formatter.format(dateTime);
	}

	/**
	 * Static number is used for formatting numbers according to javascript Intl.NumberFormat
	 * It accepts two parameters i.e number and format, number is mandatory and formal is optional.
	 * If no format is passed then by default it is set as format = {maximumFractionDigits: 2}
	 *
	 * This will do things like
	 * - Rounding off digits using toFixed, ceil and floor.
	 * - Setting up currency for the number
	 * - Limiting number of integer, fractional, significant digits.
	 *
	 * @param  number	number	A mandatory value, The number on which selected format will be applied
	 * @param  object	format	An optional value, format passed into the function as an object that contains
	 * 							paramters required for formatting the number.
	 */
	static number(number, format = {maximumFractionDigits: 2}) {

		if(!Format.cachedNumberFormat)
			Format.cachedNumberFormat = new Map();

		const cacheKey = JSON.stringify(format);

		if(!Format.cachedNumberFormat.has(cacheKey)) {

			try {
				Format.cachedNumberFormat.set(cacheKey, new Intl.NumberFormat(format.locale, format));
			}
			catch(e) {
				Format.cachedNumberFormat.set(cacheKey, new Intl.NumberFormat());
			}
		}

		if(!format.roundOff)
			return Format.cachedNumberFormat.get(cacheKey).format(number);

		let result;

		{
			const formatWhiteList = JSON.parse(JSON.stringify(format));

			for(const format in formatWhiteList) {

				if(!format.endsWith('Digits'))
					delete formatWhiteList[format];
			}

			result = parseFloat(Format.number(number, {...formatWhiteList, useGrouping: false}));
		}

		{
			if(format.roundOff == 'round')
				result = result.toFixed(format.roundPrecision || 0);

			else if(['ceil', 'floor'].includes(format.roundOff))
				result = Math[format.roundOff](result);
		}

		{
			const {roundOff: _, ...formatBlacklist} = JSON.parse(JSON.stringify(format));

			return Format.number(result, formatBlacklist);
		}
	}
}

class Sections {

	static async show(id) {

		for(const section of document.querySelectorAll('main section.section'))
			section.classList.remove('show');

		const container = document.querySelector(`main section.section#${id}`);

		if(container)
			container.classList.add('show');
	}
}

/**
 * A generic code editor UI.
 *
 * Useage:
 *
 * 	const editor = new CodeEditor();
 *
 * 	container.appendChild(editor.contaier);
 *
 * 	editor.value = 'foo';
 *
 * 	// foo
 *	console.log(editor.value);
 */
class CodeEditor {

	/**
	 * @param mode	string	Defines the color and formating scheme for the code. For example sql, js, HTML.
	 *
	 * @return CodeEditor
	 */
	constructor({mode = null} = {}) {

		if(!window.ace)
			throw new Page.exception('Ace editor not available!');

		this.mode = mode;
	}

	/**
	 * @return HTMLElement	A reference for the editor's contaier. Will be used to append it in UI.
	 */
	get container() {

		const container = this.editor.container;

		container.classList.add('code-editor');

		return container;
	}

	/**
	 * @return Creates a new Ace Editor instance if not already created and returns it.
	 */
	get editor() {

		if(this.instance)
			return this.instance;

		const editor = this.instance = ace.edit(document.createElement('div'));

		editor.setTheme('ace/theme/monokai');

		editor.setFontSize(16);
		editor.$blockScrolling = Infinity;

		if(this.mode)
			editor.getSession().setMode(`ace/mode/${this.mode}`);

		return editor;
	}

	/**
	 * @return	Get	The current value from the editor.
	 */
	get value() {
		return this.editor.getValue();
	}

	/**
	 * @param string	value	Set a new value for the editor.
	 */
	set value(value) {
		this.editor.setValue(value || '', 1);
	}

	/**
	 * Set a list of autocomplete suggestions for the editor.
	 *
	 * @param Array	list	A list of autocomplete values to pass into the editor.
	 *
	 * Format:
	 * [
	 * 	{
	 * 		name: "Foo",
	 * 		value: "foo",
	 * 		meta: "bar"
	 * 	},
	 * 	[...]
	 * ]
	 */
	setAutoComplete(list) {

		this.langTools = ace.require('ace/ext/language_tools');

		this.langTools.setCompleters([{
			getCompletions: (_, __, ___, ____, callback) => callback(null, list),
		}]);

		this.editor.setOptions({
			enableBasicAutocompletion: true,
		});
	}

	/**
	 * Assign a callback for an event on the editor.
	 *
	 * @param string	event		The event that the client wants to listen to (only 'change' is supported for now)
	 * @param Function	callback	The callback function to call when the passed event happens.
	 */
	on(event, callback) {

		if(event != 'change')
			return;

		this.editor.getSession().on('change', () => callback());
	}
}

if(typeof Node != 'undefined') {
	Node.prototype.on = window.on = function(name, fn) {
		this.addEventListener(name, fn);
	}
}

