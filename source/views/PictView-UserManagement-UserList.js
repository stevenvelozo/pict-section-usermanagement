/**
 * UserList view — admin-only table of users with search + per-row
 * Edit / Delete / Reset-password actions.
 *
 * Reads AppData.UserManagement.AllUsers. The host is expected to
 * call `provider.loadUsers()` whenever the list mounts; the view
 * itself just renders whatever's currently in AppData.
 *
 * Click handlers route through the view (so re-rendering doesn't
 * leave stale closures behind) and emit semantic actions:
 *   - 'edit' → invokes `options.OnEditUser(user)` if provided,
 *               otherwise sets AppData.UserManagement.SelectedUser
 *               for the host's edit panel to subscribe to.
 *   - 'reset' → opens an inline prompt for a new password.
 *   - 'delete' → confirms via pict-section-modal then calls deleteUser.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'PictUM-UserList',
	AutoInitialize: true,
	AutoRender: false,

	DefaultDestinationAddress: '#PictUM-UserList',
	DefaultRenderable: 'PictUM-UserList-Renderable',

	ProviderHash: 'Pict-UserManagement-Provider',

	Templates:
	[
		{
			Hash: 'PictUM-UserList-Template',
			Template: /*html*/`
<div class="pict-um-card pict-um-card-wide">
	<h1 class="pict-um-h1">Users</h1>
	<div class="pict-um-toolbar">
		<input id="PictUM-UserList-Search" type="search" placeholder="Search by username…"
			class="pict-um-input pict-um-search" />
		<button type="button" id="PictUM-UserList-Refresh" class="pict-um-btn">Refresh</button>
		<button type="button" id="PictUM-UserList-New" class="pict-um-btn pict-um-btn-primary">New user</button>
	</div>
	<div id="PictUM-UserList-Body"></div>
</div>`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'PictUM-UserList-Renderable',
			TemplateHash: 'PictUM-UserList-Template',
			ContentDestinationAddress: '#PictUM-UserList',
			RenderMethod: 'replace'
		}
	],

	CSSPriority: 500
};

class PictUserManagementUserListView extends libPictView
{
	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this._wireToolbar();
		this._renderBody();
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender
			? super.onAfterRender(pRenderable, pAddress, pRecord, pContent)
			: undefined;
	}

	_wireToolbar()
	{
		let tmpRefresh = this._byId('PictUM-UserList-Refresh');
		if (tmpRefresh && !tmpRefresh._pictUMWired)
		{
			tmpRefresh._pictUMWired = true;
			tmpRefresh.addEventListener('click', () => this._refresh());
		}
		let tmpNew = this._byId('PictUM-UserList-New');
		if (tmpNew && !tmpNew._pictUMWired)
		{
			tmpNew._pictUMWired = true;
			tmpNew.addEventListener('click', () => this._onNew());
		}
		let tmpSearch = this._byId('PictUM-UserList-Search');
		if (tmpSearch && !tmpSearch._pictUMWired)
		{
			tmpSearch._pictUMWired = true;
			let tmpDebounce = null;
			tmpSearch.addEventListener('input', () =>
			{
				if (tmpDebounce) clearTimeout(tmpDebounce);
				tmpDebounce = setTimeout(() => this._refresh(tmpSearch.value), 250);
			});
		}
	}

	_renderBody()
	{
		let tmpBody = this._byId('PictUM-UserList-Body');
		if (!tmpBody) return;
		let tmpUsers = this._users();
		if (!tmpUsers || tmpUsers.length === 0)
		{
			tmpBody.innerHTML = '';
			let tmpEmpty = document.createElement('div');
			tmpEmpty.className = 'pict-um-empty';
			tmpEmpty.textContent = 'No users to show.';
			tmpBody.appendChild(tmpEmpty);
			return;
		}
		// Build the table via DOM (not innerHTML interpolation) so user
		// fields can't break out of attributes.
		tmpBody.innerHTML = '';
		let tmpTable = document.createElement('table');
		tmpTable.className = 'pict-um-table';
		let tmpThead = document.createElement('thead');
		tmpThead.innerHTML = '<tr><th>Username</th><th>Roles</th><th>Email</th><th></th></tr>';
		tmpTable.appendChild(tmpThead);
		let tmpTbody = document.createElement('tbody');
		for (let i = 0; i < tmpUsers.length; i++)
		{
			tmpTbody.appendChild(this._buildRow(tmpUsers[i]));
		}
		tmpTable.appendChild(tmpTbody);
		tmpBody.appendChild(tmpTable);
	}

	_buildRow(pUser)
	{
		let tmpTr = document.createElement('tr');

		let tmpUsernameTd = document.createElement('td');
		tmpUsernameTd.textContent = pUser.Username || pUser.UserID || '';
		tmpTr.appendChild(tmpUsernameTd);

		let tmpRolesTd = document.createElement('td');
		let tmpRoles = Array.isArray(pUser.Roles) ? pUser.Roles : [];
		for (let i = 0; i < tmpRoles.length; i++)
		{
			let tmpPill = document.createElement('span');
			tmpPill.className = 'pict-um-pill' + (tmpRoles[i] === 'admin' ? ' pict-um-pill-admin' : '');
			tmpPill.textContent = tmpRoles[i];
			tmpRolesTd.appendChild(tmpPill);
		}
		tmpTr.appendChild(tmpRolesTd);

		let tmpEmailTd = document.createElement('td');
		tmpEmailTd.textContent = pUser.Email || '';
		tmpTr.appendChild(tmpEmailTd);

		let tmpActionsTd = document.createElement('td');
		tmpActionsTd.style.whiteSpace = 'nowrap';
		tmpActionsTd.style.textAlign = 'right';
		tmpActionsTd.appendChild(this._actionBtn('Edit', 'pict-um-btn-sm', () => this._onEdit(pUser)));
		tmpActionsTd.appendChild(document.createTextNode(' '));
		tmpActionsTd.appendChild(this._actionBtn('Reset password', 'pict-um-btn-sm', () => this._onResetPassword(pUser)));
		tmpActionsTd.appendChild(document.createTextNode(' '));
		tmpActionsTd.appendChild(this._actionBtn('Delete', 'pict-um-btn-sm pict-um-btn-danger', () => this._onDelete(pUser)));
		tmpTr.appendChild(tmpActionsTd);

		return tmpTr;
	}

	_actionBtn(pLabel, pClass, fHandler)
	{
		let tmpBtn = document.createElement('button');
		tmpBtn.type = 'button';
		tmpBtn.className = 'pict-um-btn ' + (pClass || '');
		tmpBtn.textContent = pLabel;
		tmpBtn.addEventListener('click', fHandler);
		return tmpBtn;
	}

	_refresh(pSearch)
	{
		let tmpProvider = this._provider();
		if (!tmpProvider) return;
		tmpProvider.loadUsers(pSearch || null, () => this._renderBody());
	}

	_onEdit(pUser)
	{
		// Two-stage emit: prefer the host-supplied callback, fall back
		// to AppData so a panel in the same DOM can pick it up.
		if (typeof this.options.OnEditUser === 'function')
		{
			this.options.OnEditUser(pUser);
		}
		else if (this.pict && this.pict.AppData && this.pict.AppData.UserManagement)
		{
			this.pict.AppData.UserManagement.SelectedUser = Object.assign({}, pUser);
			if (this.pict.store && typeof this.pict.store.set === 'function')
			{
				try { this.pict.store.set('UserManagement.SelectedUser', this.pict.AppData.UserManagement.SelectedUser); }
				catch (pErr) { /* ignore */ }
			}
		}
	}

	_onNew()
	{
		if (typeof this.options.OnNewUser === 'function')
		{
			this.options.OnNewUser();
		}
		else if (this.pict && this.pict.AppData && this.pict.AppData.UserManagement)
		{
			// SelectedUser=null + a flag = "open create form".
			this.pict.AppData.UserManagement.SelectedUser = null;
			this.pict.AppData.UserManagement.CreateMode = true;
			if (this.pict.store && typeof this.pict.store.set === 'function')
			{
				try { this.pict.store.set('UserManagement.CreateMode', true); }
				catch (pErr) { /* ignore */ }
			}
		}
	}

	_onResetPassword(pUser)
	{
		let tmpModal = this.pict && this.pict.views && this.pict.views['Pict-Section-Modal'];
		let tmpProvider = this._provider();
		if (!tmpProvider) return;

		// Use modal.show with an embedded input so we get a styled
		// prompt instead of native window.prompt (which is blocked
		// by Pict conventions).
		let tmpContent = '<p>Reset password for <strong>'
			+ this._escape(pUser.Username || pUser.UserID || '?')
			+ '</strong>:</p>'
			+ '<input type="password" id="PictUM-Reset-Input" class="pict-um-input" autofocus />';
		if (tmpModal && typeof tmpModal.show === 'function')
		{
			tmpModal.show(
			{
				title: 'Reset password',
				content: tmpContent,
				closeable: true,
				buttons:
				[
					{ Hash: 'cancel', Label: 'Cancel' },
					{ Hash: 'ok', Label: 'Reset', Style: 'primary' }
				]
			}).then((pChoice) =>
			{
				if (pChoice !== 'ok') return;
				let tmpInput = document.getElementById('PictUM-Reset-Input');
				let tmpNew = (tmpInput && tmpInput.value) || '';
				if (!tmpNew) return;
				tmpProvider.setUserPassword(pUser.UserID, tmpNew, (pErr) =>
				{
					if (pErr)
					{
						this._toast('Reset failed: ' + pErr.message, 'error');
						return;
					}
					this._toast('Password reset.', 'success');
				});
			});
		}
		else
		{
			// Fallback: emit via AppData so a host-defined modal can pick it up
			if (this.pict && this.pict.AppData && this.pict.AppData.UserManagement)
			{
				this.pict.AppData.UserManagement.PendingReset = { UserID: pUser.UserID };
			}
		}
	}

	_onDelete(pUser)
	{
		let tmpModal = this.pict && this.pict.views && this.pict.views['Pict-Section-Modal'];
		let tmpProvider = this._provider();
		if (!tmpProvider) return;
		let tmpName = pUser.Username || pUser.UserID || '?';
		let fGo = () =>
		{
			tmpProvider.deleteUser(pUser.UserID, (pErr) =>
			{
				if (pErr)
				{
					this._toast('Delete failed: ' + pErr.message, 'error');
					return;
				}
				this._refresh();
				this._toast('Deleted ' + tmpName, 'success');
			});
		};
		if (tmpModal && typeof tmpModal.confirm === 'function')
		{
			tmpModal.confirm('Delete user "' + tmpName + '"? This cannot be undone.',
			{
				title: 'Delete user',
				confirmLabel: 'Delete',
				cancelLabel: 'Cancel',
				dangerous: true
			}).then((pOk) => { if (pOk) fGo(); });
		}
		else
		{
			// No modal section installed — best we can do is skip
			// confirmation. Hosts should always include pict-section-modal.
			fGo();
		}
	}

	_toast(pMsg, pKind)
	{
		let tmpModal = this.pict && this.pict.views && this.pict.views['Pict-Section-Modal'];
		if (tmpModal && typeof tmpModal.toast === 'function')
		{
			tmpModal.toast(pMsg, { type: pKind || 'success' });
		}
	}

	_escape(pStr)
	{
		return String(pStr == null ? '' : pStr)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}

	_byId(pID)
	{
		if (typeof document === 'undefined') return null;
		return document.getElementById(pID);
	}

	_users()
	{
		return (this.pict.AppData && this.pict.AppData.UserManagement
			&& this.pict.AppData.UserManagement.AllUsers) || [];
	}

	_provider()
	{
		let tmpProvHash = this.options.ProviderHash || 'Pict-UserManagement-Provider';
		return this.pict && this.pict.providers && this.pict.providers[tmpProvHash];
	}
}

module.exports = PictUserManagementUserListView;
module.exports.default_configuration = _ViewConfiguration;
