const API = require('../utils/api');

class SyncUserRoles extends API {

	constructor({accountUrl, userDetails, categories = []} = {}) {

		super();

		this.accountUrl = accountUrl;
		this.userDetails = userDetails;
		this.categories = categories;

		this.assert(this.accountUrl && this.userDetails, 'Account url and user details required')
	}

	async initiate() {

		this.account = await this.fetchAccount();
		this.assert(this.account, 'Insert account not found');

		this.user = await this.syncUser();
		this.assert(this.user, 'Not able to add user');

		if(!this.categories.length) {

			return this.user;
		}

		this.userCategories = await this.syncCategories();
		this.assert(this.userCategories, 'Not able to add user categories');

		await this.syncUserRoles();
		await this.deleteNonExistingUserRoles();

		return {
			user: this.user,
			user_categories: this.userCategories
		};
	}

	async fetchAccount() {

		const [account] = await this.mysql.query(`
			SELECT
				a.*,
				role_id
			FROM
				tb_accounts a
			JOIN
				tb_roles r USING(account_id)
			WHERE
				find_in_set(?, url) > 0
				AND a.status = 1
			`,
			[this.accountUrl]
		);

		return account;
	}

	async syncUser() {

		await this.mysql.query(
			`INSERT INTO tb_users (
				account_id,
				phone,
				email,
				first_name,
				last_name,
				password,
				status
			)
			VALUES (?, ?, ?, ?, ?, "not a password", 1)
			ON DUPLICATE KEY UPDATE 
				first_name = VALUES(first_name),
				last_name = VALUES(last_name),
				status = VALUES(status)
			`,
			[
				this.account.account_id,
				this.userDetails.phone || null,
				this.userDetails.email,
				this.userDetails.first_name,
				this.userDetails.last_name
			],
			'write'
		);

		const [user] = await this.mysql.query(
			'SELECT * FROM tb_users WHERE account_id = ? AND email = ?',
			[this.account.account_id, this.userDetails.email]
		);

		return user;
	}

	async syncCategories() {

		const categories = [];

		for(const category of this.categories) {

			if(!category.name || (!category.slug && category.slug != 0)) {

				continue;
			}

			categories.push([
				this.account.account_id,
				category.name,
				category.slug,
				parseFloat(category.is_admin) || 0
			]);
		}

		await this.mysql.query(
			`INSERT IGNORE INTO tb_categories 
				(account_id, name, slug, is_admin) VALUES ? 
			ON DUPLICATE KEY UPDATE
				name = VALUES(name)
			`,
			[categories],
			'write'
		);

		const slugs = this.categories.map(x => x.slug);

		return await this.mysql.query(
			'SELECT * FROM tb_categories WHERE slug in (?) and account_id = ?',
			[slugs, this.account.account_id]
		);
	}

	async syncUserRoles() {

		const
			userExistingRoles = await this.mysql.query(
				`SELECT
					*
				FROM 
					tb_object_roles
				WHERE
					account_id = ?
					AND owner = 'user'
					AND owner_id = ?
					AND target = 'role'
					AND target_id = ?
				`,
				[this.account.account_id, this.user.user_id, this.account.role_id]
			),
			existingCategories = userExistingRoles.length ? userExistingRoles.map(x => x.category_id) : [];

		let	categoryIds = this.userCategories.map(x => x.category_id);

		this.deleteCategories = existingCategories.filter(x => !categoryIds.includes(x));

		categoryIds = categoryIds.filter(x => !existingCategories.includes(x));

		if(!categoryIds.length) {

			return;
		}

		const roles = categoryIds.map(x => [this.account.account_id, this.user.user_id, 'user', x, this.account.role_id, 'role', 0]);

		await this.mysql.query(
			`INSERT INTO tb_object_roles
				(account_id, owner_id, owner, category_id, target_id, target, added_by) VALUES ?
			`,
			[roles],
			'write'
		);

		await this.mysql.query(
			`UPDATE 
				tb_object_roles SET group_id = id 
			WHERE 
				account_id = ?
				AND owner = 'user'
				AND owner_id = ? 
				AND target = 'role'
				AND target_id = ? 
				AND category_id IN (?)
			`,
			[this.account.account_id, this.user.user_id, this.account.role_id, categoryIds],
			'write'
		);
	}

	async deleteNonExistingUserRoles() {

		if(!this.deleteCategories.length) {

			return;
		}

		const categoryIds = this.userCategories.map(x => x.category_id);

		await this.mysql.query(
			`DELETE FROM 
				tb_object_roles 
			WHERE 
				account_id = ? 
				AND owner = 'user'
				AND owner_id = ? 
				AND target = 'role'
				AND target_id = ? 
				AND category_id NOT IN (?)
				AND added_by = 0
			`,
			[this.account.account_id, this.user.user_id, this.account.role_id, categoryIds],
			'write'
		);
	}

}

module.exports = SyncUserRoles;