Page.class = class Home extends Page {

	constructor() {

		super();

		this.setup();
	}

	setup() {

		this.container.appendChild(this.schemaForm);
	}

	get schemaForm() {

		if(this.schemaFormContainer) {

			return this.schemaFormContainer;
		}

		const container = this.schemaFormContainer =  document.createElement('div');

		container.innerHTML = `
			
			<h1>Get Schema</h1>
			
			<div class="database-info block">
			
				<button type="button" class="main">Main</button>
				
				<button type="button" class="logs">Logs</button>
			</div>
		`;

		this.editor = new CodeEditor({mode: 'sql'});

		container.appendChild(this.editor.container);

		this.editor.editor.setReadOnly(true);
		this.editor.container.classList.add('hidden');

		container.querySelector('.main').on('click', () => this.schema());
		container.querySelector('.logs').on('click', () => this.schema('logs'));

		return container;
	}

	async schema(db = 'main') {

		const schema = await API.call('databaseSchema/get', {db});

		this.editor.value = schema;
		this.editor.container.classList.remove('hidden');
	}
}