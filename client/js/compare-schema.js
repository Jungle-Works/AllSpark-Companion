Page.class = class Home extends Page {

	constructor() {

		super();

		this.render();
	}

	async render() {

		this.container.querySelector('.get-diff').on('click', async () => {

			const result = await API.call('compareDB/compareDatabases');

			const resultContainer = this.container.querySelector('.result');
			resultContainer.classList.remove('hidden');

			resultContainer.innerHTML = `

				<h3>Tables Not Found</h3>
				<table class="table-not-found">
					<thead>
						<tr>
							<th>Table Name's</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>

				<h3>Columns Not Found</h3>
				<table class="column-not-found">
					<thead>
						<tr>
							<th>Table Name</th>
							<th>Column Name</th>
							<th>Coumn Type</th>
							<th>Column Key</th>
							<th>Default Value</th>
							<th>Is Nullable</th>
							<th>Character Set Name</th>
							<th>Extra</th>
						</tr>
					</thead>

					<tbody></tbody>
				</table>

				<h3>Column Value Changed</h3>
				<table class="column-value-changed">
					<thead>
						<tr>
							<th>Table Name</th>
							<th>Column Changed</th>
							<th>Key Changed</th>
							<th>Local Value</th>
							<th>Remote Value</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			`;

			const table_not_found = resultContainer.querySelector('table.table-not-found tbody');
			const column_not_found = resultContainer.querySelector('table.column-not-found tbody');
			const column_value_changed = resultContainer.querySelector('table.column-value-changed tbody');

			for(const table of result.table_not_found) {

				const tr = document.createElement('tr');

				tr.innerHTML = `
					<td>${table}</td>
				`;

				table_not_found.appendChild(tr);
			}

			if(!result.table_not_found.length)
				table_not_found.innerHTML = '<tr><td colspan="1">No Tables Changed</td></tr>';

			for(const column of result.column_not_found) {

				const tr = document.createElement('tr');

				tr.innerHTML = `
					<td>${column.table_name}</td>
					<td>${column.column_name}</td>
					<td>${column.column_type}</td>
					<td>${column.column_key}</td>
					<td>${column.column_default}</td>
					<td>${column.is_nullable}</td>
					<td>${column.character_set_name}</td>
					<td>${column.extra}</td>
				`;

				column_not_found.appendChild(tr);
			}

			if(!result.column_not_found.length)
				column_not_found.innerHTML = '<tr><td colspan="8">No Coumns Changed</td></tr>';

			for(const column of result.column_value_changed) {

				const tr = document.createElement('tr');

				tr.innerHTML = `
					<td>${column.table_name}</td>
					<td>${column.column_changed}</td>
					<td>${column.key_changed}</td>
					<td>${column.current_value}</td>
					<td>${column.updated_value}</td>
				`;

				column_value_changed.appendChild(tr);
			}

			if(!result.column_value_changed.length)
				column_value_changed.innerHTML = '<tr><td colspan="8">No Values Changed</td></tr>';
		});
	}
}