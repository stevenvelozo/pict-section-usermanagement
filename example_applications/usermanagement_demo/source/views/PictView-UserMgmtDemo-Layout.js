/**
 * UserMgmtDemo-Layout — page shell.
 *
 * Renders the topbar (with the section's CurrentUser badge), a tab
 * strip, an info banner, and a body region containing the mount
 * points the user-management section's views render into.
 *
 * The layout drives lifecycle:
 *   - On first render, calls `provider.checkSession()` so the
 *     CurrentUser badge can populate (or fall through to login).
 *   - When ActiveTab === 'users', calls `provider.loadUsers()` so
 *     the UserList view has data on first paint.
 *   - When the active tab changes the appropriate child views
 *     re-render; views the user isn't looking at have their
 *     containers hidden (display:none) rather than torn down so
 *     the form state survives quick tab toggles.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'UserMgmtDemo-Layout',
	AutoInitialize: true,
	AutoRender: false,

	DefaultDestinationAddress: '#UserMgmtDemo-Application-Container',
	DefaultRenderable: 'UserMgmtDemo-Layout-Renderable',

	Templates:
	[
		{
			Hash: 'UserMgmtDemo-Layout-Template',
			Template: /*html*/`
<div class="demo-shell">
	<div class="demo-topbar">
		<div class="demo-brand">
			<span class="demo-brand-mark">U</span>
			<span>pict-section-usermanagement</span>
			<span class="demo-brand-tag">demo</span>
		</div>
		<div class="demo-current-user-slot">
			<span id="PictUM-CurrentUser"></span>
		</div>
	</div>
	<div class="demo-tabs" id="UserMgmtDemo-Tabs"></div>
	<div class="demo-content">
		<div class="demo-info-card" id="UserMgmtDemo-Info"></div>
		<div id="UserMgmtDemo-LoggedOut">
			<div id="PictUM-Login"></div>
		</div>
		<div id="UserMgmtDemo-LoggedIn" class="demo-hidden">
			<div id="UserMgmtDemo-UsersPane">
				<div id="PictUM-UserList"></div>
				<div id="PictUM-UserEdit" style="margin-top: 16px;"></div>
			</div>
			<div id="UserMgmtDemo-ChangePane" class="demo-hidden">
				<div id="PictUM-PasswordChange"></div>
			</div>
		</div>
	</div>
</div>`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'UserMgmtDemo-Layout-Renderable',
			TemplateHash: 'UserMgmtDemo-Layout-Template',
			ContentDestinationAddress: '#UserMgmtDemo-Application-Container',
			RenderMethod: 'replace'
		}
	],

	CSSPriority: 400
};

class UserMgmtDemoLayoutView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._didInitialCheck = false;
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this._renderTabs();
		this._renderInfo();
		// First-render side effect: kick CheckSession so the badge
		// shows current state. Done once via the guard so re-renders
		// from tab switches don't re-fetch unnecessarily.
		if (!this._didInitialCheck)
		{
			this._didInitialCheck = true;
			let tmpProvider = this._provider();
			if (tmpProvider && typeof tmpProvider.checkSession === 'function')
			{
				tmpProvider.checkSession(() => this._renderChildren());
			}
		}
		this._renderChildren();
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender
			? super.onAfterRender(pRenderable, pAddress, pRecord, pContent)
			: undefined;
	}

	_renderTabs()
	{
		let tmpEl = document.getElementById('UserMgmtDemo-Tabs');
		if (!tmpEl) return;
		let tmpActive = this._activeTab();
		let tmpLogged = this._provider() && this._provider().isLoggedIn();
		let tmpAdmin = this._provider() && this._provider().isAdmin();
		// Login tab disappears once you're in. Users tab requires admin.
		// Change-password tab requires any session.
		let tmpTabs = [];
		if (!tmpLogged) tmpTabs.push({ id: 'login', label: 'Sign in' });
		if (tmpLogged && tmpAdmin) tmpTabs.push({ id: 'users', label: 'Users' });
		if (tmpLogged) tmpTabs.push({ id: 'change-password', label: 'Change password' });

		tmpEl.innerHTML = '';
		for (let i = 0; i < tmpTabs.length; i++)
		{
			let tmpTab = tmpTabs[i];
			let tmpBtn = document.createElement('button');
			tmpBtn.type = 'button';
			tmpBtn.className = 'demo-tab' + (tmpActive === tmpTab.id ? ' demo-tab-active' : '');
			tmpBtn.textContent = tmpTab.label;
			let tmpID = tmpTab.id;
			tmpBtn.addEventListener('click', () =>
			{
				let tmpApp = this.pict && this.pict.PictApplication;
				if (tmpApp && typeof tmpApp.switchTab === 'function') tmpApp.switchTab(tmpID);
			});
			tmpEl.appendChild(tmpBtn);
		}
	}

	_renderInfo()
	{
		let tmpEl = document.getElementById('UserMgmtDemo-Info');
		if (!tmpEl) return;
		tmpEl.innerHTML = ''
			+ '<strong>Demo backend.</strong> '
			+ 'This page runs against an in-browser <code>MemoryAuthProvider</code>. '
			+ 'Try <code>admin / admin</code> for the admin role, or '
			+ '<code>alice / wonderland</code> for a regular user. '
			+ 'Refreshing the page logs you out (sessions are not persisted).';
	}

	_renderChildren()
	{
		let tmpProvider = this._provider();
		let tmpLogged = tmpProvider && tmpProvider.isLoggedIn();
		let tmpAdmin = tmpProvider && tmpProvider.isAdmin();
		let tmpActive = this._activeTab();

		// Toggle visibility of the panes based on session + tab.
		document.getElementById('UserMgmtDemo-LoggedOut').className = tmpLogged ? 'demo-hidden' : '';
		document.getElementById('UserMgmtDemo-LoggedIn').className = tmpLogged ? '' : 'demo-hidden';
		let tmpUsersPane = document.getElementById('UserMgmtDemo-UsersPane');
		let tmpChangePane = document.getElementById('UserMgmtDemo-ChangePane');
		if (tmpUsersPane) tmpUsersPane.className = (tmpActive === 'users' && tmpAdmin) ? '' : 'demo-hidden';
		if (tmpChangePane) tmpChangePane.className = (tmpActive === 'change-password') ? '' : 'demo-hidden';

		// Always render CurrentUser; it draws nothing if logged out.
		this._safeRender('PictUM-CurrentUser');

		if (!tmpLogged)
		{
			this._safeRender('PictUM-Login');
			return;
		}
		// Logged-in panes: render whichever is active.
		if (tmpActive === 'users' && tmpAdmin)
		{
			this._safeRender('PictUM-UserList');
			this._safeRender('PictUM-UserEdit');
			// Refresh users on first display of this tab. Re-render
			// UserList in the callback because the provider writes the
			// fetched array to AppData, but the view only paints when
			// explicitly asked — there's no general AppData subscription
			// in this demo. Real apps that wire pict.store get auto-rerender
			// for free.
			tmpProvider.loadUsers((pErr) =>
			{
				if (pErr) return;
				this._safeRender('PictUM-UserList');
			});
		}
		else if (tmpActive === 'change-password')
		{
			this._safeRender('PictUM-PasswordChange');
		}
		else
		{
			// Logged in but no tab selected → default to users for admins,
			// change-password for everyone else.
			let tmpDefault = tmpAdmin ? 'users' : 'change-password';
			this.pict.AppData.UserMgmtDemo.ActiveTab = tmpDefault;
			this._renderChildren();
		}
	}

	_safeRender(pViewName)
	{
		let tmpView = this.pict.views[pViewName];
		if (tmpView && typeof tmpView.render === 'function')
		{
			tmpView.render();
		}
	}

	_activeTab()
	{
		return (this.pict.AppData.UserMgmtDemo
			&& this.pict.AppData.UserMgmtDemo.ActiveTab) || 'login';
	}

	_provider()
	{
		return this.pict.providers && this.pict.providers['Pict-UserManagement-Provider'];
	}
}

module.exports = UserMgmtDemoLayoutView;
module.exports.default_configuration = _ViewConfiguration;
