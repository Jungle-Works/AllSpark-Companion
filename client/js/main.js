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
 * A generic implementation for a multiple select dropdown.
 *
 * It has the following features.
 *
 * - Takes a list of possible values in a specific format [{name, value}]
 * - Lets users select one or multiple of these values.
 * - Provides a clean interface with a value getter and setter.
 * - The input can be disabled as well.
 */
class MultiSelect {

	/**
	 * Create a new instance for the MultiSelect.
	 *
	 * @param  Array	options.datalist			The set of possible values for the MultiSelect.
	 * @param  Boolean	options.multiple			Toggle for allowing the user to select multiple values.
	 * @param  Boolean	options.expand				Wether the dropdown should float and show when needed or if it should take it's own place and always be visible.
	 * @param  String	options.dropDownPosition	The position for the dropdown, can be 'top' or 'bottom'.
	 * @param  String	options.mode				The way to show options, can be 'Collapse', 'Stretch', 'Expand' or 'Open Stretched'
	 * @param  String	options.name				Appears as a heading in the expand mode.
	 * @param  String	options.maxSelections		maxSelections limit the selections in the list.
	 * @param  String	options.disabled			Disabled option to enable the read-only mode.
	 * @return MultiSelect							The object reference for MultiSelect
	 */
	constructor({datalist = [], multiple = true, dropDownPosition = 'bottom', mode = 'collapse', name = '', maxSelections, disabled = false, value = []} = {}) {

		this.callbacks = new Set;
		this.selectedValues = new Set();

		this.datalist = datalist;
		this.multiple = multiple;
		this.maxSelections = maxSelections;
		this.disabled = disabled;
		this.dropDownPosition = ['top', 'bottom'].includes(dropDownPosition) ? dropDownPosition : 'bottom';
		this.inputName = 'multiselect-' + Math.floor(Math.random() * 10000);
		this.name = name;

		this.mode = MultiSelect.modes.some(x => x.value == mode) ? mode : MultiSelect.modes[0].value;
		this.value = value;
	}

	static get modes() {

		return [
			{
				name: 'Collapse',
				value: 'collapse',
			},
			{
				name: 'Stretch',
				value: 'stretch',
			},
			{
				name: 'Expand',
				value: 'expand',
			},
			{
				name: 'Open Stretched',
				value: 'open-stretched',
			}
		]
	}

	/**
	 * The main container of the MultiSelect.
	 *
	 * @return HTMLElement	A div that has the entire content.
	 */
	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');

		container.classList.add('multi-select');

		container.innerHTML = `
			<div class="screen" tabindex="0"></div>
		`;

		this.screen = container.querySelector('.screen');

		if(this.mode == 'stretch') {

			container.appendChild(this.options);
			container.classList.add('stretched');
			this.options.classList.remove('hidden');
		}

		container.classList.add(this.dropDownPosition);

		this.render();

		this.screen.on('click', e => {

			e.stopPropagation();
			e.preventDefault();

			if(this.disabled) {

				return;
			}

			if(!this.optionsContainer) {

				this.container.appendChild(this.options);
				this.render();
			}

			if(this.mode == 'expand') {

				this.expand();
			}
			else if(this.mode == 'open-stretched') {

				this.container.classList.add('stretched');
			}

			const optionsHidden = this.options.classList.contains('hidden');

			if(!['stretch', 'expand'].includes(this.mode)) {

				for(const option of document.querySelectorAll('.multi-select:not(.stretched) .options')) {

					option.classList.add('hidden');
				}

				this.options.classList.toggle('hidden', !optionsHidden);
			}
			else {

				this.options.classList.remove('hidden');
			}

			this.search.globalSearch.container.querySelector('.searchQuery').focus();
		});

		document.body.on('click', () => {

			this.setScreenText();

			if(!this.optionsContainer) {

				return;
			}

			this.options.classList.toggle('hidden', !['stretch', 'expand'].includes(this.mode));
		});

		return container;
	}

	get options() {

		if(this.optionsContainer) {

			return this.optionsContainer;
		}

		const options = this.optionsContainer = document.createElement('div');
		options.classList.add('options', 'hidden');

		this.search = new SearchColumnFilters({
			data: [...this._datalist.values()],
			filters: [
				{
					key: 'Name',
					rowValue: row => [row.name],
				},
				{
					key: 'Value',
					rowValue: row => [row.value],
				},
				{
					key: 'Subtitle',
					rowValue: row => row.subtitle ? [row.subtitle] : [],
				},
			],
			advancedSearch: true
		});

		options.innerHTML = `
			<header>
				<a class="all">All</a>
				<a class="clear">Clear</a>
				<select name="mode">
					<option value="collapse">Collapse</option>
					<option value="stretch">Stretch</option>
					<option value="open-stretched">Open Stretched</option>
					<option value="expand">Expand</option>
				</select>
			</header>
			<div class="list"></div>
			<div class="no-matches NA hidden">No data found</div>
			<footer></footer>
		`;

		const header = options.querySelector('header');

		header.insertAdjacentElement('beforeend', this.search.container);
		header.insertAdjacentElement('beforeend', this.search.globalSearch.container);

		options.on('click', e => e.stopPropagation());
		header.on('click', e => e.preventDefault());

		options.querySelector('header .all').on('click', () => this.all());
		options.querySelector('header .clear').on('click', () => this.clear());

		this.search.on('change', () => {

			this.filterDataMap = new Map(this.search.filterData.map(x => [x.value, x]));
			this.recalculate();
		});

		const mode = options.querySelector('select[name=mode]');

		mode.value = this.mode;
		mode.disabled = this.disabled;

		mode.on('change', () => {

			if(this.mode == 'expand') {

				this.expandDialog.hide();
				this.container.appendChild(this.options);
			}

			this.mode = mode.value;

			this.container.classList.toggle('stretched', ['stretch', 'open-stretched'].includes(this.mode));
			this.options.classList.toggle('hidden', this.mode == 'collapse');

			if(mode.value == 'expand') {

				this.expand();
			}

			if(this.search.size > 1) {

				this.reset();
			}

			this.search.globalSearch.container.querySelector('.searchQuery').focus();

		});

		return options;
	}

	expand() {

		if(this.disabled || !this._datalist) {

			return;
		}

		const advancedSearch = this.search.globalSearch.container.querySelector('.advanced');

		if(!this.expandDialog) {

			this.expandDialog = new DialogBox();
			this.expandDialog.container.classList.add('multi-select-expanded');

			this.expandDialog.on('close', () => {

				if(!this.search.container.classList.contains('hidden')) {

					advancedSearch.click();
				}

				advancedSearch.classList.add('hidden');
			});

			this.expandDialog.heading = this.name;
		}

		this.expandDialog.body.appendChild(this.options);
		advancedSearch.classList.remove('hidden');

		if(this.search.size > 1) {

			advancedSearch.click();
		}

		this.options.classList.remove('hidden');

		this.expandDialog.show();
	}

	/**
	 * Render the datalist to the MultiSelect.
	 * Call this externally if you have just updated the datalist after object construction.
	 */
	render() {

		if(!this.optionsContainer || !this._datalist || !this._datalist.size) {

			return this.recalculate();
		}

		this.container.classList.toggle('disabled', this.disabled);

		this.options.querySelector('header .all').classList.toggle('hidden', !this.multiple);
		this.options.querySelector('header select[name=mode]').disabled = this.disabled;
		this.search.globalSearch.container.querySelector('.searchQuery').disabled = this.disabled;

		const optionList = this.options.querySelector('.list');

		optionList.textContent = null;

		this.expandDialog = null;

		this.loadList(this.options.querySelector('.list'));
	}

	loadList(list, data = this._datalist) {

		list.textContent = null;

		let tabStart = Math.floor(Math.random() * 1000);

		for(const row of data.values()) {

			const
				label = document.createElement('label'),
				input = document.createElement('input'),
				text = document.createElement('div');

			label.setAttribute('tabIndex', tabStart);
			tabStart += 1;

			text.classList.add('option-name');
			text.innerHTML = `<span>${row.name}</span>`;

			if(row.subtitle && row.subtitle != '') {

				const subtitle = document.createElement('span');
				subtitle.classList.add('subtitle');

				subtitle.innerHTML = row.subtitle;
				text.appendChild(subtitle);
			}

			input.name = this.inputName;
			input.type = this.multiple ? 'checkbox' : 'radio';

			label.appendChild(input);
			label.appendChild(text);

			label.setAttribute('title', row.value);

			input.on('change', () => {

				if(!this.multiple) {

					this.selectedValues.clear();
					this.selectedValues.add(row.value);
				}
				else {

					input.checked && this.selectedValues.size < (this.maxSelections || Math.min()) ? this.selectedValues.add(row.value) : this.selectedValues.delete(row.value);
				}

				this.setScreenText();

				this.recalculate();
				this.fireCallback('change');
			});

			input.on('focus', () => label.classList.add('hover'));
			input.on('focusout', () => label.classList.remove('hover'));

			input.disabled = this.disabled;
			row.input = input;

			label.on('dblclick', e => {

				e.stopPropagation();

				this.clear();
				label.click();
			});

			label.classList.toggle('grey', this.disabled);

			list.appendChild(label);
		}

		this.recalculate();
	}

	/**
	 * Remove the multiselect's container from DOM.
	 */
	remove() {

		if(this.containerElement) {
			this.container.remove();
		}
	}

	/**
	 * Recalculate shown items from the datalist based on any value in search box and their summary numbers in the footer.
	 */
	recalculate() {

		if(!this.containerElement) {

			return;
		}

		if(!this.optionsContainer) {

			this.fireCallback('change');
			return this.setScreenText();
		}

		this.options.querySelector('select[name=mode]').value = this.mode;

		for(const row of this._datalist.values()) {

			row.input.checked = this.selectedValues.has(row.value);

			row.input.disabled = this.disabled || (!row.input.checked && this.maxSelections && this.selectedValues.size == this.maxSelections);
			row.input.parentElement.classList.toggle('grey', row.input.disabled);

			row.hide = false;

			if(this.filterDataMap && !this.filterDataMap.has(row.value)) {

				row.hide = true;
			}

			row.input.parentElement.classList.toggle('hidden', row.hide);
			row.input.parentElement.classList.toggle('selected', row.input.checked);
		}

		this.search.globalSearch.container.querySelector('.advanced').classList.toggle('hidden', this.mode != 'expand');

		const footer = this.options.querySelector('footer');

		footer.innerHTML = `
			<span>Total: <strong>${this._datalist.size}</strong></span>
			<span>Selected: <strong>${this.selectedValues.size}</strong></span>
		`;

		if(this.filterDataMap && this.filterDataMap.size != this._datalist.size) {

			footer.insertAdjacentHTML('beforeend', `<span>Showing: <strong>${this.filterDataMap.size}</strong></span>`);
		}

		this.setScreenText();

		if(this.maxSelections && this.multiple) {

			footer.insertAdjacentHTML('beforeend', `<span>Max Selections: <strong>${this.maxSelections}</strong></span>`);
		}

		this.options.querySelector('.no-matches').classList.toggle('hidden', this.search.filterData.length);
		this.options.querySelector('.list').classList.toggle('hidden', !this.search.filterData.length);
	}

	/**
	 * Assign a callback to the MultiSelect.
	 *
	 * @param  string	event		The type of event. Only 'change' supported for now.
	 * @param  Function	callback	The callback to call when the selected value in the multiselect changes.
	 */
	on(event, callback) {

		this.callbacks.add({event, callback});
	}

	fireCallback(event) {

		for(const callback of this.callbacks) {

			if(callback.event == event)
				callback.callback();
		}
	}

	/**
	 * Select all inputs of the MultiSelect, if applicable.
	 * May not be applicable if multiple is set to false.
	 */
	all() {

		if(!this.multiple || this.disabled || !this._datalist) {

			return;
		}

		this.selectedValues.clear();

		for(const data of this._datalist.values()) {

			if(data.hide || (this.maxSelections && this.selectedValues.size >= this.maxSelections)) {

				continue;
			}

			this.selectedValues.add(data.value);
		}

		this.recalculate();
		this.fireCallback('change');
	}

	/**
	 * Clear the MultiSelect.
	 */
	clear() {

		if(this.disabled) {

			return;
		}

		for(const data of this._datalist.values()) {

			if (!data.hide) {

				this.selectedValues.delete(data.value)
			}
		}

		this.recalculate();
		this.fireCallback('change');
	}

	reset() {

		if(this.disabled || !this.optionsContainer) {

			return;
		}

		this.search.clear();
		this.selectedValues.clear();

		if(this.filterDataMap) {

			this.filterDataMap = new Map(this.search.filterData.map(x => [x.value, x]));
		}

		this.recalculate();
		this.fireCallback('change');
	}

	setScreenText() {

		if(!this.selectedValues.size) {

			return this.screen.textContent = 'No items selected.';
		}

		const first = this._datalist.get(this.selectedValues.values().next().value);

		this.screen.innerHTML = this.selectedValues.size > 1 ? `${first.name} and ${this.selectedValues.size - 1} more` : first.name;
	}

	get datalist() {

		return this._datalist ? [...this._datalist.values()] : [];
	}

	set datalist(datalist) {

		if(Array.isArray(datalist) && datalist.length) {

			this._datalist = new Map(datalist.map(x => [x.value, x]));
		}
		else if (datalist instanceof Map) {

			this._datalist = datalist;
		}
		else {

			this._datalist = new Map();
		}

		for(const value of this.selectedValues) {

			if(!this._datalist.has(value)) {

				this.selectedValues.delete(value);
			}
		}

		if(this.optionsContainer) {

			this.search.data =  [...this._datalist.values()];
		}

		this.fireCallback('change');
	}

	/**
	 * Update the value of a MultiSelect.
	 * This will also take care of updating the UI and fire any change callbacks if needed.
	 *
	 * @param  Array	values	The array of new values that must match the datalist.
	 */
	set value(values = []) {

		if(!(this._datalist && this._datalist.size)) {

			return;
		}

		if(!Array.isArray(values)) {

			values = [values];
		}

		this.selectedValues.clear();

		for(const value of values) {

			if(!this._datalist.has(value) || (this.maxSelections && this.selectedValues.size >= this.maxSelections)) {

				continue;
			}

			this.selectedValues.add(value);

			if (!this.multiple) {

				break;
			}
		}

		this.recalculate();
		this.fireCallback('change');
	}

	/**
	 * Get the current value of the MultiSelect.
	 *
	 * @return Array	An array of 'value' properties of the datalist.
	 */
	get value() {

		return Array.from(this.selectedValues);
	}

	/**
	 * Change the disabled state of the MultiSelect.
	 *
	 * @param  boolean value The new state of the disabled property.
	 */
	set disabled(value) {

		this._disabled = value;
		this.render();
	}

	/**
	 * Get the disabled status of the MultiSelect.
	 */
	get disabled() {

		return this._disabled;
	}
}

/**
 * Show a snackbar type notification somewhere on screen.
 */
class SnackBar {

	static setup() {

		SnackBar.container = {
			'bottom-left': document.createElement('div'),
		};

		SnackBar.container['bottom-left'].classList.add('snack-bar-container', 'bottom-left', 'hidden');

		document.body.appendChild(SnackBar.container['bottom-left']);
	}

	/**
	 * Create a new Snackbar notification instance. This will show the notfication instantly.
	 *
	 * @param String	options.message		The message body.
	 * @param String	options.subtitle	The messgae subtitle.
	 * @param String	options.type		success (green), warning (yellow), error (red).
	 * @param String	options.icon		A font awesome name for the snackbar icon.
	 * @param Number	options.timeout		(Seconds) How long the notification will be visible.
	 * @param String	options.position	bottom-left (for now).
	 */
	constructor({message = null, subtitle = null, type = 'success', icon = null, timeout = 5, position = 'bottom-left'} = {}) {

		this.container = document.createElement('div');
		this.page = window.page;

		this.message = message;
		this.subtitle = subtitle;
		this.type = type;
		this.icon = icon;
		this.timeout = parseInt(timeout);
		this.position = position;

		if(!this.message)
			throw new Page.exception('SnackBar Message is required.');

		if(!parseInt(this.timeout))
			throw new Page.exception(`Invalid SnackBar timeout: ${this.timeout}.`);

		if(!['success', 'warning', 'error'].includes(this.type))
			throw new Page.exception(`Invalid SnackBar type: ${this.type}.`);

		if(!['bottom-left'].includes(this.position))
			throw new Page.exception(`Invalid SnackBar position: ${this.position}.`);

		if(this.subtitle && this.subtitle.length > 250)
			this.subtitle = this.subtitle.substring(0, 250) + '&hellip;';

		this.show();
	}

	show() {

		if(document.fullscreenElement) {

			document.exitFullscreen();
		}

		let icon = null;

		if(this.icon)
			icon = this.icon;

		else if(this.type == 'success')
			icon = 'fas fa-check';

		else if(this.type == 'warning')
			icon = 'fas fa-exclamation-triangle';

		else if(this.type == 'error')
			icon = 'fas fa-exclamation-triangle';

		let subtitle = '';

		if(this.subtitle)
			subtitle = `<div class="subtitle">${this.subtitle}</div>`;

		this.container.innerHTML = `
			<div class="icon"><i class="${icon}"></i></div>
			<div class="title ${subtitle ? '' : 'no-subtitle'}">${this.message}</div>
			${subtitle}
			<div class="close">&times;</div>
		`;

		this.container.classList.add('snack-bar', this.type);

		this.container.on('click', () => this.hide());

		// Add the show class out of the current event loop so that CSS transitions have time to initiate.
		setTimeout(() => this.container.classList.add('show'));

		// Hide the snackbar after the timeout.
		setTimeout(() => this.hide(), this.timeout * 1000);

		SnackBar.container[this.position].classList.remove('hidden');
		SnackBar.container[this.position].appendChild(this.container);
		SnackBar.container[this.position].scrollTop = SnackBar.container[this.position].scrollHeight;
	}

	/**
	 * Hide the snack bar and also hide the container if no other snackbar is in the container.
	 */
	hide() {

		this.container.classList.remove('show');

		setTimeout(() => {

			this.container.remove();

			if(!SnackBar.container[this.position].children.length)
				SnackBar.container[this.position].classList.add('hidden');

		}, Page.transitionDuration);
	}
}

/**
 * A generic implementation for a modal box.
 *
 * It has the following features.
 *
 * - Lets users set the heading, body content and footer of the dialog.
 * - Provides a clean interface with user controlled show and hide features.
 */
class DialogBox {

	constructor({closable = true} = {}) {

		this.closable = closable;
	}

	/**
	 * The main container of the Dialog Box.
	 *
	 * @return	HTMLElement	A div that has the entire content.
	 */
	get container() {

		// Make sure we have a container to append the dialog box in
		if(!DialogBox.container) {
			throw new Page.exception('Dialog Box container not defined before use!');
		}

		if(this.containerElement) {
			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');

		container.classList.add('dialog-box-blanket');

		container.innerHTML = `
			<section class="dialog-box">
				<header><h3></h3></header>
				<div class="body"></div>
			</section>
		`;

		if(this.closable) {

			container.querySelector('header').insertAdjacentHTML(
				'beforeend',
				'<span class="close"><i class="fa fa-times"></i></span>'
			);

			container.querySelector('.dialog-box header span.close').on('click', () => this.hide());

			container.on('click', () => this.hide());
		}

		container.querySelector('.dialog-box').on('click', e => e.stopPropagation());

		this.hide();

		return container;
	}

	/**
	 * Update the heading of the dialog box
	 *
	 * @param	dialogHeading	The new heading
	 */
	set heading(dialogHeading) {

		const heading = this.container.querySelector('.dialog-box header h3');

		if(dialogHeading instanceof HTMLElement) {

			heading.textContent = null;
			heading.appendChild(dialogHeading);
		}

		else if(typeof dialogHeading == 'string') {
			heading.innerHTML = dialogHeading;
		}

		else {
			throw new Page.exception('Invalid heading format');
		}
	}

	/**
	 *
	 * @return HTMLElement	reference to the dialog box body container to set the content of the dialog box.
	 */
	get body() {

		return this.container.querySelector('.dialog-box .body');
	}

	/**
	 * Hides the dialog box container
	 */
	hide() {

		this.container.remove();

		if(this.closeCallback) {
			this.closeCallback();
		}

		// If another dialog box is open then don't remove blur
		if(!document.body.querySelector('.dialog-box-blanket .dialog-box')) {
			document.querySelector('main').classList.remove('blur');
			document.querySelector('header').classList.remove('blur');
			NotificationBar.container.classList.remove('blur');
		}
	}

	/**
	 * Displays the dialog box container
	 */
	show() {

		if(document.fullscreenElement) {
			document.exitFullscreen();
		}

		if(this.closable) {

			document.body.removeEventListener('keyup', this.keyUpListener);

			document.body.on('keyup', this.keyUpListener = e => {

				if(e.keyCode == 27) {
					this.hide();
				}
			});
		}

		document.querySelector('main').classList.add('blur');
		document.querySelector('header').classList.add('blur');
		NotificationBar.container.classList.add('blur');

		DialogBox.container.appendChild(this.container);
	}

	/**
	 * Returns the current state of the dialog box (open / closed)
	 */
	get status() {
		return document.contains(this.container);
	}

	on(event, callback) {

		if(event != 'close') {
			throw new Page.exception('Only Close event is supported...');
		}

		this.closeCallback = callback;
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

