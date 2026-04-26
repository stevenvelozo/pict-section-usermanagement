/**
 * PasswordChange view — self-change for the current session.
 *
 * Three fields: current password, new password, confirm new password.
 * Submit calls `provider.changePassword(current, new)`. The route
 * resolves the target user from the session cookie server-side, so
 * the view doesn't need to know anything about UserID.
 *
 * Renders nothing if no session is active — guard at the host level
 * if you want a hard "must be logged in to see this" experience.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'PictUM-PasswordChange',
	AutoInitialize: true,
	AutoRender: false,

	DefaultDestinationAddress: '#PictUM-PasswordChange',
	DefaultRenderable: 'PictUM-PasswordChange-Renderable',

	ProviderHash: 'Pict-UserManagement-Provider',

	Templates:
	[
		{
			Hash: 'PictUM-PasswordChange-Template',
			Template: /*html*/`
<div class="pict-um-card">
	<h1 class="pict-um-h1">Change password</h1>
	<form id="PictUM-PasswordChange-Form" autocomplete="off">
		<div class="pict-um-field">
			<label class="pict-um-label" for="PictUM-PasswordChange-Current">Current password</label>
			<input id="PictUM-PasswordChange-Current" class="pict-um-input"
				type="password" autocomplete="current-password" required />
		</div>
		<div class="pict-um-field">
			<label class="pict-um-label" for="PictUM-PasswordChange-New">New password</label>
			<input id="PictUM-PasswordChange-New" class="pict-um-input"
				type="password" autocomplete="new-password" required />
		</div>
		<div class="pict-um-field">
			<label class="pict-um-label" for="PictUM-PasswordChange-Confirm">Confirm new password</label>
			<input id="PictUM-PasswordChange-Confirm" class="pict-um-input"
				type="password" autocomplete="new-password" required />
		</div>
		<div id="PictUM-PasswordChange-Message"></div>
		<div class="pict-um-actions">
			<button type="submit" class="pict-um-btn pict-um-btn-primary"
				id="PictUM-PasswordChange-Submit">Change password</button>
		</div>
	</form>
</div>`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'PictUM-PasswordChange-Renderable',
			TemplateHash: 'PictUM-PasswordChange-Template',
			ContentDestinationAddress: '#PictUM-PasswordChange',
			RenderMethod: 'replace'
		}
	],

	CSSPriority: 500
};

class PictUserManagementPasswordChangeView extends libPictView
{
	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		let tmpForm = this._byId('PictUM-PasswordChange-Form');
		if (tmpForm && !tmpForm._pictUMWired)
		{
			tmpForm._pictUMWired = true;
			tmpForm.addEventListener('submit', (pE) =>
			{
				pE.preventDefault();
				this._submit();
			});
		}
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender
			? super.onAfterRender(pRenderable, pAddress, pRecord, pContent)
			: undefined;
	}

	_submit()
	{
		let tmpProvider = this._provider();
		if (!tmpProvider)
		{
			this._showMessage('No user-management provider available.', 'error');
			return;
		}
		let tmpCurrent = (this._byId('PictUM-PasswordChange-Current') || {}).value || '';
		let tmpNew = (this._byId('PictUM-PasswordChange-New') || {}).value || '';
		let tmpConfirm = (this._byId('PictUM-PasswordChange-Confirm') || {}).value || '';
		if (!tmpCurrent || !tmpNew || !tmpConfirm)
		{
			this._showMessage('All fields are required.', 'error');
			return;
		}
		if (tmpNew !== tmpConfirm)
		{
			this._showMessage('New password and confirmation do not match.', 'error');
			return;
		}
		if (tmpNew === tmpCurrent)
		{
			this._showMessage('New password must differ from current.', 'error');
			return;
		}
		this._setSubmitting(true);
		tmpProvider.changePassword(tmpCurrent, tmpNew, (pErr, pBody) =>
		{
			this._setSubmitting(false);
			if (pErr)
			{
				this._showMessage((pErr.body && pErr.body.Reason) || pErr.message || 'Change failed', 'error');
				return;
			}
			if (pBody && pBody.Success === false)
			{
				this._showMessage(pBody.Reason || 'Change failed', 'error');
				return;
			}
			this._showMessage('Password updated. Other sessions have been signed out.', 'success');
			// Clear inputs so the user doesn't accidentally resubmit.
			let tmpCurEl = this._byId('PictUM-PasswordChange-Current');
			let tmpNewEl = this._byId('PictUM-PasswordChange-New');
			let tmpConfEl = this._byId('PictUM-PasswordChange-Confirm');
			if (tmpCurEl) tmpCurEl.value = '';
			if (tmpNewEl) tmpNewEl.value = '';
			if (tmpConfEl) tmpConfEl.value = '';
		});
	}

	_setSubmitting(pSubmitting)
	{
		let tmpBtn = this._byId('PictUM-PasswordChange-Submit');
		if (!tmpBtn) return;
		tmpBtn.disabled = !!pSubmitting;
		tmpBtn.textContent = pSubmitting ? 'Saving…' : 'Change password';
	}

	_showMessage(pText, pKind)
	{
		let tmpEl = this._byId('PictUM-PasswordChange-Message');
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

	_byId(pID)
	{
		if (typeof document === 'undefined') return null;
		return document.getElementById(pID);
	}

	_provider()
	{
		let tmpProvHash = this.options.ProviderHash || 'Pict-UserManagement-Provider';
		return this.pict && this.pict.providers && this.pict.providers[tmpProvHash];
	}
}

module.exports = PictUserManagementPasswordChangeView;
module.exports.default_configuration = _ViewConfiguration;
