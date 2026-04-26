/**
 * CurrentUser view — compact session badge + logout button.
 *
 * Designed to slot into a top bar / header. Reads
 * AppData.UserManagement.CurrentUser. Renders empty when
 * LoggedIn is false (so hosts can render unconditionally
 * without conditional layout shifts).
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'PictUM-CurrentUser',
	AutoInitialize: true,
	AutoRender: false,

	DefaultDestinationAddress: '#PictUM-CurrentUser',
	DefaultRenderable: 'PictUM-CurrentUser-Renderable',

	ProviderHash: 'Pict-UserManagement-Provider',

	Templates:
	[
		{
			Hash: 'PictUM-CurrentUser-Template',
			Template: /*html*/`
<div id="PictUM-CurrentUser-Inner"></div>`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'PictUM-CurrentUser-Renderable',
			TemplateHash: 'PictUM-CurrentUser-Template',
			ContentDestinationAddress: '#PictUM-CurrentUser',
			RenderMethod: 'replace'
		}
	],

	CSSPriority: 500
};

class PictUserManagementCurrentUserView extends libPictView
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
		let tmpInner = (typeof document !== 'undefined')
			? document.getElementById('PictUM-CurrentUser-Inner') : null;
		if (!tmpInner) return;

		let tmpProvider = this._provider();
		let tmpCurrent = tmpProvider ? tmpProvider.currentUser() : { LoggedIn: false };
		if (!tmpCurrent || !tmpCurrent.LoggedIn)
		{
			// Render nothing visible — the host's auth gate decides
			// whether to show the login form somewhere else.
			tmpInner.innerHTML = '';
			return;
		}

		let tmpRecord = tmpCurrent.UserRecord || tmpCurrent;
		let tmpName = tmpRecord.FullName || tmpRecord.LoginID || tmpRecord.Username
			|| tmpCurrent.UserID || '?';
		let tmpInitials = String(tmpName).split(/\s+/)
			.map((s) => s.charAt(0).toUpperCase()).join('').slice(0, 2) || '?';
		let tmpRoles = Array.isArray(tmpRecord.Roles) ? tmpRecord.Roles : [];

		// Build via DOM so user-supplied fields can't sneak HTML through.
		tmpInner.innerHTML = '';
		let tmpWrap = document.createElement('span');
		tmpWrap.className = 'pict-um-currentuser';

		let tmpAvatar = document.createElement('span');
		tmpAvatar.className = 'pict-um-currentuser-avatar';
		tmpAvatar.textContent = tmpInitials;
		tmpWrap.appendChild(tmpAvatar);

		let tmpNameSpan = document.createElement('span');
		tmpNameSpan.className = 'pict-um-currentuser-name';
		tmpNameSpan.textContent = tmpName;
		tmpWrap.appendChild(tmpNameSpan);

		if (tmpRoles.length > 0)
		{
			let tmpRolesSpan = document.createElement('span');
			tmpRolesSpan.className = 'pict-um-currentuser-roles';
			tmpRolesSpan.textContent = '· ' + tmpRoles.join(', ');
			tmpWrap.appendChild(tmpRolesSpan);
		}

		let tmpLogoutBtn = document.createElement('button');
		tmpLogoutBtn.type = 'button';
		tmpLogoutBtn.className = 'pict-um-currentuser-logout';
		tmpLogoutBtn.textContent = 'Sign out';
		tmpLogoutBtn.addEventListener('click', () => this._logout());
		tmpWrap.appendChild(tmpLogoutBtn);

		tmpInner.appendChild(tmpWrap);
	}

	_logout()
	{
		let tmpProvider = this._provider();
		if (!tmpProvider) return;
		tmpProvider.logout(() =>
		{
			// Re-render to drop the badge. Hosts that want to react
			// further (e.g. re-paint a login form somewhere else,
			// redirect to a public route) pass `OnLogout` in the
			// view options — it fires AFTER the badge re-renders so
			// the host can stack visual changes on top.
			this.render();
			if (typeof this.options.OnLogout === 'function')
			{
				try { this.options.OnLogout(); }
				catch (pErr) { /* swallow — view shouldn't fail because of host hook */ }
			}
		});
	}

	_provider()
	{
		let tmpProvHash = this.options.ProviderHash || 'Pict-UserManagement-Provider';
		return this.pict && this.pict.providers && this.pict.providers[tmpProvHash];
	}
}

module.exports = PictUserManagementCurrentUserView;
module.exports.default_configuration = _ViewConfiguration;
