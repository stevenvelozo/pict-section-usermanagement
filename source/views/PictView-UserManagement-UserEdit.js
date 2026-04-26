/**
 * UserEdit view — create-or-update form.
 *
 * Three modes, distinguished by what's present at render time:
 *   1. AppData.UserManagement.CreateMode === true  → empty form,
 *      submit creates a new user.
 *   2. AppData.UserManagement.SelectedUser is set → form
 *      prefilled, submit updates that user.
 *   3. Neither → renders empty.
 *
 * Submit calls `provider.createUser(spec)` or `provider.updateUser(id, updates)`.
 * On success, calls `provider.loadUsers()` so the list reflects the
 * change, and clears CreateMode / SelectedUser so the form goes back
 * to the empty state.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'PictUM-UserEdit',
	AutoInitialize: true,
	AutoRender: false,

	DefaultDestinationAddress: '#PictUM-UserEdit',
	DefaultRenderable: 'PictUM-UserEdit-Renderable',

	ProviderHash: 'Pict-UserManagement-Provider',

	Templates:
	[
		{
			Hash: 'PictUM-UserEdit-Template',
			Template: /*html*/`
<div id="PictUM-UserEdit-Inner"></div>`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'PictUM-UserEdit-Renderable',
			TemplateHash: 'PictUM-UserEdit-Template',
			ContentDestinationAddress: '#PictUM-UserEdit',
			RenderMethod: 'replace'
		}
	],

	CSSPriority: 500
};

class PictUserManagementUserEditView extends libPictView
{
	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this._renderInner();
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender
			? super.onAfterRender(pRenderable, pAddress, pRecord, pContent)
			: undefined;
	}

	_renderInner()
	{
		let tmpInner = this._byId('PictUM-UserEdit-Inner');
		if (!tmpInner) return;

		let tmpAD = this._appData();
		let tmpCreate = !!(tmpAD && tmpAD.CreateMode);
		let tmpExisting = (tmpAD && tmpAD.SelectedUser) || null;

		if (!tmpCreate && !tmpExisting)
		{
			tmpInner.innerHTML = '';
			return;
		}

		let tmpUser = tmpExisting || {};
		let tmpHTML = ''
			+ '<div class="pict-um-card">'
			+   '<h1 class="pict-um-h1">' + (tmpCreate ? 'Create user' : 'Edit user') + '</h1>'
			+   '<form id="PictUM-UserEdit-Form">'
			+     this._field('Username', 'PictUM-UserEdit-Username', 'text',
				tmpUser.Username || '', tmpCreate ? null : 'Username changes re-key the user.')
			+     this._field('Full name', 'PictUM-UserEdit-FullName', 'text', tmpUser.FullName || '', null)
			+     this._field('Email',     'PictUM-UserEdit-Email',    'email', tmpUser.Email || '', null)
			+     this._field('Roles (comma-separated)', 'PictUM-UserEdit-Roles', 'text',
				(tmpUser.Roles || []).join(', '), null)
			+     (tmpCreate ? this._field('Password', 'PictUM-UserEdit-Password', 'password', '', null) : '')
			+     '<div id="PictUM-UserEdit-Message"></div>'
			+     '<div class="pict-um-actions">'
			+       '<button type="button" id="PictUM-UserEdit-Cancel" class="pict-um-btn">Cancel</button>'
			+       '<button type="submit" id="PictUM-UserEdit-Submit" class="pict-um-btn pict-um-btn-primary">'
			+         (tmpCreate ? 'Create' : 'Save changes')
			+       '</button>'
			+     '</div>'
			+   '</form>'
			+ '</div>';
		tmpInner.innerHTML = tmpHTML;

		let tmpForm = this._byId('PictUM-UserEdit-Form');
		if (tmpForm)
		{
			tmpForm.addEventListener('submit', (pE) =>
			{
				pE.preventDefault();
				if (tmpCreate) this._submitCreate();
				else this._submitUpdate(tmpUser);
			});
		}
		let tmpCancel = this._byId('PictUM-UserEdit-Cancel');
		if (tmpCancel) tmpCancel.addEventListener('click', () => this._cancel());
	}

	_field(pLabel, pID, pType, pValue, pHint)
	{
		// Always escape values in attribute context.
		let tmpVal = String(pValue == null ? '' : pValue)
			.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
		let tmpHint = pHint
			? '<div class="pict-um-sub" style="margin: 4px 0 0; font-size: 11px;">' + pHint + '</div>'
			: '';
		return ''
			+ '<div class="pict-um-field">'
			+   '<label class="pict-um-label" for="' + pID + '">' + pLabel + '</label>'
			+   '<input type="' + pType + '" id="' + pID + '" class="pict-um-input" value="' + tmpVal + '" />'
			+   tmpHint
			+ '</div>';
	}

	_collectInputs()
	{
		let tmpUsername = (this._byId('PictUM-UserEdit-Username') || {}).value || '';
		let tmpFullName = (this._byId('PictUM-UserEdit-FullName') || {}).value || '';
		let tmpEmail = (this._byId('PictUM-UserEdit-Email') || {}).value || '';
		let tmpRolesRaw = (this._byId('PictUM-UserEdit-Roles') || {}).value || '';
		let tmpRoles = tmpRolesRaw.split(',').map((s) => s.trim()).filter(Boolean);
		let tmpPassword = (this._byId('PictUM-UserEdit-Password') || {}).value || '';
		// `return\n{` triggers automatic-semicolon-insertion in JS —
		// the function would silently return undefined. Brace on the
		// same line as `return`.
		return {
			Username: tmpUsername.trim(),
			FullName: tmpFullName.trim(),
			Email: tmpEmail.trim(),
			Roles: tmpRoles,
			Password: tmpPassword
		};
	}

	_submitCreate()
	{
		let tmpProvider = this._provider();
		if (!tmpProvider) return;
		let tmpVals = this._collectInputs();
		if (!tmpVals.Username || !tmpVals.Password)
		{
			this._showMessage('Username and password are required.', 'error');
			return;
		}
		let tmpSpec =
		{
			Username: tmpVals.Username,
			Password: tmpVals.Password,
			FullName: tmpVals.FullName,
			Email: tmpVals.Email,
			Roles: tmpVals.Roles
		};
		this._setSubmitting(true);
		tmpProvider.createUser(tmpSpec, (pErr, pBody) =>
		{
			this._setSubmitting(false);
			if (pErr)
			{
				this._showMessage((pErr.body && pErr.body.Reason) || pErr.message || 'Create failed', 'error');
				return;
			}
			if (pBody && pBody.Success === false)
			{
				this._showMessage(pBody.Reason || 'Create failed', 'error');
				return;
			}
			this._afterMutation('Created.');
		});
	}

	_submitUpdate(pUser)
	{
		let tmpProvider = this._provider();
		if (!tmpProvider) return;
		let tmpVals = this._collectInputs();
		// Build a minimal update payload — only fields the user actually
		// changed go through. Server's allow-list still gates this, but
		// sending fewer fields keeps the audit log readable.
		let tmpUpdates = {};
		if (tmpVals.Username !== (pUser.Username || '')) tmpUpdates.Username = tmpVals.Username;
		if (tmpVals.FullName !== (pUser.FullName || '')) tmpUpdates.FullName = tmpVals.FullName;
		if (tmpVals.Email !== (pUser.Email || '')) tmpUpdates.Email = tmpVals.Email;
		let tmpExistingRoles = (pUser.Roles || []).slice().sort().join(',');
		let tmpNewRoles = tmpVals.Roles.slice().sort().join(',');
		if (tmpExistingRoles !== tmpNewRoles) tmpUpdates.Roles = tmpVals.Roles;

		if (Object.keys(tmpUpdates).length === 0)
		{
			this._showMessage('No changes to save.', 'error');
			return;
		}
		this._setSubmitting(true);
		tmpProvider.updateUser(pUser.UserID, tmpUpdates, (pErr, pBody) =>
		{
			this._setSubmitting(false);
			if (pErr)
			{
				this._showMessage((pErr.body && pErr.body.Reason) || pErr.message || 'Save failed', 'error');
				return;
			}
			if (pBody && pBody.Success === false)
			{
				this._showMessage(pBody.Reason || 'Save failed', 'error');
				return;
			}
			this._afterMutation('Saved.');
		});
	}

	_afterMutation(pMessage)
	{
		// Refresh list, clear edit state, render the now-empty form.
		let tmpProvider = this._provider();
		let tmpAD = this._appData();
		if (tmpAD)
		{
			tmpAD.CreateMode = false;
			tmpAD.SelectedUser = null;
		}
		if (tmpProvider) tmpProvider.loadUsers();
		this._toast(pMessage, 'success');
		this.render();
	}

	_cancel()
	{
		let tmpAD = this._appData();
		if (tmpAD)
		{
			tmpAD.CreateMode = false;
			tmpAD.SelectedUser = null;
		}
		this.render();
	}

	_setSubmitting(pSubmitting)
	{
		let tmpBtn = this._byId('PictUM-UserEdit-Submit');
		if (!tmpBtn) return;
		tmpBtn.disabled = !!pSubmitting;
	}

	_showMessage(pText, pKind)
	{
		let tmpEl = this._byId('PictUM-UserEdit-Message');
		if (!tmpEl) return;
		if (!pText) { tmpEl.innerHTML = ''; return; }
		let tmpDiv = document.createElement('div');
		tmpDiv.className = (pKind === 'success')
			? 'pict-um-message pict-um-message-success'
			: 'pict-um-message pict-um-message-error';
		tmpDiv.textContent = pText;
		tmpEl.innerHTML = '';
		tmpEl.appendChild(tmpDiv);
	}

	_toast(pMsg, pKind)
	{
		let tmpModal = this.pict && this.pict.views && this.pict.views['Pict-Section-Modal'];
		if (tmpModal && typeof tmpModal.toast === 'function')
		{
			tmpModal.toast(pMsg, { type: pKind || 'success' });
		}
	}

	_byId(pID)
	{
		if (typeof document === 'undefined') return null;
		return document.getElementById(pID);
	}

	_appData()
	{
		return (this.pict && this.pict.AppData
			&& this.pict.AppData.UserManagement) || null;
	}

	_provider()
	{
		let tmpProvHash = this.options.ProviderHash || 'Pict-UserManagement-Provider';
		return this.pict && this.pict.providers && this.pict.providers[tmpProvHash];
	}
}

module.exports = PictUserManagementUserEditView;
module.exports.default_configuration = _ViewConfiguration;
