/**
 * Login view — username + password form.
 *
 * Renders into `options.DestinationAddress` (host configures it,
 * default '#PictUM-Login'). On submit, calls
 * `provider.login(u, p)`. On success, AppData.UserManagement.CurrentUser
 * flips to LoggedIn:true; the host's app-level switch (or a parent
 * view subscribed to that key) is responsible for replacing this view
 * with the main UI.
 *
 * The view does NOT itself navigate — staying decoupled from any
 * particular routing scheme. Hosts that want auto-redirect-on-login
 * subscribe to UserManagement.CurrentUser in the store.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'PictUM-Login',
	AutoInitialize: true,
	AutoRender: false,

	DefaultDestinationAddress: '#PictUM-Login',
	DefaultRenderable: 'PictUM-Login-Renderable',

	ProviderHash: 'Pict-UserManagement-Provider',

	Templates:
	[
		{
			Hash: 'PictUM-Login-Template',
			Template: /*html*/`
<div class="pict-um-card">
	<h1 class="pict-um-h1">Sign in</h1>
	<div class="pict-um-sub">Enter your credentials to continue.</div>
	<form id="PictUM-Login-Form" autocomplete="on">
		<div class="pict-um-field">
			<label class="pict-um-label" for="PictUM-Login-Username">Username</label>
			<input id="PictUM-Login-Username" class="pict-um-input"
				type="text" name="username" autocomplete="username"
				required autofocus />
		</div>
		<div class="pict-um-field">
			<label class="pict-um-label" for="PictUM-Login-Password">Password</label>
			<input id="PictUM-Login-Password" class="pict-um-input"
				type="password" name="password" autocomplete="current-password"
				required />
		</div>
		<div id="PictUM-Login-Message"></div>
		<div class="pict-um-actions">
			<button type="submit" class="pict-um-btn pict-um-btn-primary"
				id="PictUM-Login-Submit">Sign in</button>
		</div>
	</form>
</div>`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'PictUM-Login-Renderable',
			TemplateHash: 'PictUM-Login-Template',
			ContentDestinationAddress: '#PictUM-Login',
			RenderMethod: 'replace'
		}
	],

	CSSPriority: 500
};

class PictUserManagementLoginView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._submitting = false;
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		// Wire the form on every render — re-rendering replaces the
		// DOM, so the previous listener is gone with the old form.
		let tmpForm = this._byId('PictUM-Login-Form');
		if (tmpForm && !tmpForm._pictUMWired)
		{
			tmpForm._pictUMWired = true;
			tmpForm.addEventListener('submit', (pEvent) =>
			{
				pEvent.preventDefault();
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
		if (this._submitting) return;
		let tmpProvider = this._provider();
		if (!tmpProvider)
		{
			this._showMessage('No user-management provider available.', 'error');
			return;
		}
		let tmpUserEl = this._byId('PictUM-Login-Username');
		let tmpPassEl = this._byId('PictUM-Login-Password');
		let tmpUser = tmpUserEl ? tmpUserEl.value.trim() : '';
		let tmpPass = tmpPassEl ? tmpPassEl.value : '';
		if (!tmpUser || !tmpPass)
		{
			this._showMessage('Username and password are required.', 'error');
			return;
		}
		this._setSubmitting(true);
		this._showMessage('', null);

		tmpProvider.login(tmpUser, tmpPass, (pErr, pResult) =>
		{
			this._setSubmitting(false);
			if (pErr)
			{
				this._showMessage(pErr.message || 'Login failed', 'error');
				return;
			}
			if (pResult && pResult.LoggedIn)
			{
				this._showMessage('Welcome, ' + (pResult.UserID || tmpUser) + '!', 'success');
				// Wipe the password field — basic hygiene.
				if (tmpPassEl) tmpPassEl.value = '';
				// OnLogin hook lets the host re-paint the surrounding
				// UI without subscribing to AppData. Same pattern as
				// CurrentUser's OnLogout.
				if (typeof this.options.OnLogin === 'function')
				{
					try { this.options.OnLogin(pResult); } catch (pErr2) { /* swallow */ }
				}
			}
			else
			{
				this._showMessage((pResult && pResult.Error) || 'Login failed', 'error');
			}
		});
	}

	_setSubmitting(pSubmitting)
	{
		this._submitting = !!pSubmitting;
		let tmpBtn = this._byId('PictUM-Login-Submit');
		if (tmpBtn)
		{
			tmpBtn.disabled = !!pSubmitting;
			tmpBtn.textContent = pSubmitting ? 'Signing in…' : 'Sign in';
		}
	}

	_showMessage(pText, pKind)
	{
		let tmpEl = this._byId('PictUM-Login-Message');
		if (!tmpEl) return;
		if (!pText)
		{
			tmpEl.innerHTML = '';
			return;
		}
		let tmpClass = (pKind === 'success')
			? 'pict-um-message pict-um-message-success'
			: 'pict-um-message pict-um-message-error';
		// pText is an arbitrary string from the server / from us; it
		// goes into a textContent path via DOM creation rather than
		// innerHTML interpolation so server-supplied error reasons
		// can't inject HTML.
		let tmpDiv = document.createElement('div');
		tmpDiv.className = tmpClass;
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

module.exports = PictUserManagementLoginView;
module.exports.default_configuration = _ViewConfiguration;
