/**
 * Pict-Application-UserMgmtDemo
 *
 * Top-level Pict application for the pict-section-usermanagement
 * demo. Wires up:
 *
 *   - pict-section-modal (confirms / toasts — required by the
 *     UserList view's destructive actions per Pict conventions)
 *   - pict-section-usermanagement (provider + 5 views) installed
 *     via the section's `install()` helper, with a mock Fetcher so
 *     the demo runs without a backend.
 *   - A small layout view that hosts the section's mount points
 *     and a simple tab strip.
 *
 * To point the demo at a real backend (e.g., a running ultravisor
 * with auth-beacon), replace the `Fetcher` option in
 * `Pict-UserManagement-Provider` config with the browser-native
 * `fetch` and set `BaseURL` to the right prefix.
 */
'use strict';

const libPictApplication = require('pict-application');
const libPictSectionModal = require('pict-section-modal');
const libPictSectionUserManagement = require('pict-section-usermanagement');

const libConfiguration = require('./Pict-Application-UserMgmtDemo-Configuration.json');
const libViewLayout = require('./views/PictView-UserMgmtDemo-Layout.js');
const libCreateMockFetcher = require('./MockAuthFetcher.js');

const _DEMO_SEED_USERS =
[
	{ Username: 'admin', Password: 'admin', Roles: ['admin'],
		FullName: 'Admin User', Email: 'admin@example.com' },
	{ Username: 'alice', Password: 'wonderland', Roles: ['user'],
		FullName: 'Alice Liddell', Email: 'alice@example.com' },
	{ Username: 'bob', Password: 'builder', Roles: ['user'],
		FullName: 'Bob Builder', Email: 'bob@example.com' }
];

class UserMgmtDemoApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		// Modal toolkit — installed under the conventional 'Pict-Section-Modal'
		// hash so the user-management views' confirm/toast calls find it.
		this.pict.addView('Pict-Section-Modal', {}, libPictSectionModal);

		// pict-section-usermanagement — install() registers the
		// provider + all five views under default hashes
		// (PictUM-Login / -CurrentUser / -UserList / -UserEdit /
		// -PasswordChange). The Fetcher is the only demo-specific
		// override for the API surface; OnLogin / OnLogout hooks
		// let the layout view re-render on session-state flips
		// without an explicit AppData subscription.
		let tmpSelf = this;
		libPictSectionUserManagement.install(this.pict,
		{
			ProviderOptions:
			{
				BaseURL: '/1.0/',
				Fetcher: libCreateMockFetcher(_DEMO_SEED_USERS)
			},
			ViewOptions:
			{
				Login:       { OnLogin:  () => tmpSelf._reflowLayout() },
				CurrentUser: { OnLogout: () => tmpSelf._reflowLayout() }
			}
		});

		// Layout view — the page chrome that hosts the section's views.
		this.pict.addView('UserMgmtDemo-Layout',
			libViewLayout.default_configuration, libViewLayout);
	}

	onAfterInitializeAsync(fCallback)
	{
		this.pict.AppData.UserMgmtDemo =
		{
			ActiveTab: 'login'   // 'login' | 'users' | 'change-password'
		};

		// Render the layout — that view drives initial CheckSession
		// and the section view renders.
		this.pict.views['UserMgmtDemo-Layout'].render();

		return fCallback ? fCallback() : null;
	}

	// ===== Tab navigation (called from layout's onclick) =====

	switchTab(pTab)
	{
		this.pict.AppData.UserMgmtDemo.ActiveTab = pTab;
		this.pict.views['UserMgmtDemo-Layout'].render();
	}

	/**
	 * Re-render the layout in response to a login or logout. Resets the
	 * active tab to a sensible default for the new session state so the
	 * user doesn't end up on a tab the new role can't see.
	 */
	_reflowLayout()
	{
		let tmpProvider = this.pict.providers['Pict-UserManagement-Provider'];
		let tmpLogged = tmpProvider && tmpProvider.isLoggedIn();
		this.pict.AppData.UserMgmtDemo.ActiveTab = tmpLogged
			? (tmpProvider.isAdmin() ? 'users' : 'change-password')
			: 'login';
		this.pict.views['UserMgmtDemo-Layout'].render();
	}
}

module.exports = UserMgmtDemoApplication;
module.exports.default_configuration = libConfiguration;
module.exports.pict_configuration = libConfiguration.pict_configuration;
