/**
 * pict-section-usermanagement — entry point.
 *
 * Provides login, current-user badge, and admin user-management views
 * backed by orator-authentication's session routes plus the auth-beacon
 * /Users CRUD endpoints.
 *
 * Two ways to consume this module:
 *
 *   1. Manual registration — host imports the named exports and
 *      registers each provider/view itself. Most flexible, recommended
 *      for apps that already have their own boot flow:
 *
 *        const um = require('pict-section-usermanagement');
 *
 *        pict.addProvider('Pict-UserManagement-Provider',
 *            um.Provider.default_configuration, um.Provider);
 *        pict.addView('PictUM-Login',
 *            um.LoginView.default_configuration, um.LoginView);
 *        pict.addView('PictUM-CurrentUser',
 *            um.CurrentUserView.default_configuration, um.CurrentUserView);
 *        pict.addView('PictUM-UserList',
 *            um.UserListView.default_configuration, um.UserListView);
 *        pict.addView('PictUM-UserEdit',
 *            um.UserEditView.default_configuration, um.UserEditView);
 *        pict.addView('PictUM-PasswordChange',
 *            um.PasswordChangeView.default_configuration, um.PasswordChangeView);
 *
 *   2. One-shot install — convenience for hosts that just want
 *      everything wired up with default options:
 *
 *        require('pict-section-usermanagement').install(pict);
 *        require('pict-section-usermanagement').install(pict, {
 *            ProviderOptions: { BaseURL: '/myapi/' },
 *            Views: ['Login', 'CurrentUser']     // subset
 *        });
 *
 * The install helper avoids any magic — it just calls addProvider /
 * addView for each requested piece. Reading the source is the fastest
 * way to understand the wiring.
 */

const libProvider = require('./Pict-Provider-UserManagement.js');
const libLoginView = require('./views/PictView-UserManagement-Login.js');
const libCurrentUserView = require('./views/PictView-UserManagement-CurrentUser.js');
const libUserListView = require('./views/PictView-UserManagement-UserList.js');
const libUserEditView = require('./views/PictView-UserManagement-UserEdit.js');
const libPasswordChangeView = require('./views/PictView-UserManagement-PasswordChange.js');

// Map of view-shortname → { module, viewHash } so the install helper
// can spell out the friendly names without leaking any internal hash
// quirks. Hosts that want a different ViewIdentifier merge their own
// over the default_configuration before passing to addView.
const _Views =
{
	Login: { lib: libLoginView, hash: 'PictUM-Login' },
	CurrentUser: { lib: libCurrentUserView, hash: 'PictUM-CurrentUser' },
	UserList: { lib: libUserListView, hash: 'PictUM-UserList' },
	UserEdit: { lib: libUserEditView, hash: 'PictUM-UserEdit' },
	PasswordChange: { lib: libPasswordChangeView, hash: 'PictUM-PasswordChange' }
};

function install(pPict, pOptions)
{
	if (!pPict || typeof pPict.addProvider !== 'function')
	{
		throw new Error('pict-section-usermanagement.install: first arg must be a Pict instance');
	}
	pOptions = pOptions || {};
	let tmpProviderOpts = Object.assign({},
		libProvider.default_configuration, pOptions.ProviderOptions || {});
	pPict.addProvider('Pict-UserManagement-Provider', tmpProviderOpts, libProvider);

	let tmpViewNames = Array.isArray(pOptions.Views) ? pOptions.Views : Object.keys(_Views);
	for (let i = 0; i < tmpViewNames.length; i++)
	{
		let tmpEntry = _Views[tmpViewNames[i]];
		if (!tmpEntry)
		{
			(pPict.log && pPict.log.warn)
				? pPict.log.warn('pict-section-usermanagement: unknown view name "' + tmpViewNames[i] + '" — skipped')
				: null;
			continue;
		}
		let tmpViewOpts = Object.assign({},
			tmpEntry.lib.default_configuration,
			(pOptions.ViewOptions && pOptions.ViewOptions[tmpViewNames[i]]) || {});
		pPict.addView(tmpEntry.hash, tmpViewOpts, tmpEntry.lib);
	}
}

module.exports = libProvider;
module.exports.Provider = libProvider;
module.exports.LoginView = libLoginView;
module.exports.CurrentUserView = libCurrentUserView;
module.exports.UserListView = libUserListView;
module.exports.UserEditView = libUserEditView;
module.exports.PasswordChangeView = libPasswordChangeView;
module.exports.install = install;
