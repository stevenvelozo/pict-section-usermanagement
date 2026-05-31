# Pict Section UserManagement

> **[&#9654; Read the Pict-Section-UserManagement Documentation](https://fable-retold.github.io/pict-section-usermanagement/)** &mdash; interactive docs with the full API and usage reference.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

User-management UI for Pict applications: a REST provider plus five views — login, a current-user badge, an admin user list, a create/edit user form, and a self-service password change. It is backed by [orator-authentication](https://github.com/fable-retold/orator-authentication)'s session routes (`Authenticate` / `Deauthenticate` / `CheckSession`) and the [ultravisor-auth-beacon](https://github.com/stevenvelozo/ultravisor-auth-beacon) `/Users` CRUD surface.

The provider owns every network call and writes results into `pict.AppData.UserManagement`. The views are thin: they render from `AppData`, collect input, and call provider methods. No view fetches on its own.

## Features

- **Provider + Views split** -- One provider does the REST I/O; five views render from `AppData`. Register only what you need.
- **orator-authentication sessions** -- `login` / `logout` / `checkSession` map to `POST Authenticate` / `POST Deauthenticate` / `GET CheckSession`.
- **auth-beacon /Users CRUD** -- `loadUsers`, `getUser`, `createUser`, `updateUser`, `deleteUser`, `setUserPassword`, and `changePassword`.
- **AppData-driven** -- Session, user list, selected user, last error, and loading flags all live under `pict.AppData.UserManagement`.
- **Configurable transport** -- A `BaseURL` (default `/1.0/`) prefixes every path, and a pluggable `Fetcher` lets you inject a mock or wrap the transport. The default uses `globalThis.fetch` with `credentials: 'same-origin'`.
- **Host hooks** -- `OnLogin`, `OnLogout`, `OnEditUser`, and `OnNewUser` view options let the host re-flow its layout.
- **Role awareness** -- `isLoggedIn()` and `isAdmin()` convenience guards (admin role name is the `AdminRole` option).
- **Modal-aware** -- Destructive UserList actions use [pict-section-modal](https://github.com/fable-retold/pict-section-modal) for confirmation, prompts, and toasts.
- **Themable** -- A shared `.pict-um-*` stylesheet, registered at priority 500, driven by `--pict-um-*` / `--theme-color-*` tokens.

## Installation

```bash
npm install pict-section-usermanagement
```

Runtime dependencies are `pict-provider` and `pict-view`. The UserList view's confirm / prompt / toast affordances expect `pict-section-modal` registered under the hash `Pict-Section-Modal`.

## Quick Start

```javascript
const libPict = require('pict');
const libPictSectionModal = require('pict-section-modal');
const libPictSectionUserManagement = require('pict-section-usermanagement');

const _Pict = new libPict();

// Modal toolkit (confirm / prompt / toast) under the conventional hash.
_Pict.addView('Pict-Section-Modal', {}, libPictSectionModal);

// Provider + all five views, under default hashes.
libPictSectionUserManagement.install(_Pict,
	{
		ProviderOptions: { "BaseURL": "/1.0/" },
		ViewOptions:
		{
			Login:       { OnLogin:  () => _Pict.views['PictUM-CurrentUser'].render() },
			CurrentUser: { OnLogout: () => _Pict.views['PictUM-Login'].render() }
		}
	});

// The provider does not auto-fetch — check the session on boot.
const tmpProvider = _Pict.providers['Pict-UserManagement-Provider'];
tmpProvider.checkSession(() =>
{
	_Pict.views['PictUM-CurrentUser'].render();
	if (!tmpProvider.isLoggedIn())
	{
		_Pict.views['PictUM-Login'].render();
	}
});
```

Drop the mount points the registered views render into:

```html
<span id="PictUM-CurrentUser"></span>
<div id="PictUM-Login"></div>
<div id="PictUM-UserList"></div>
<div id="PictUM-UserEdit"></div>
<div id="PictUM-PasswordChange"></div>
```

See the [Quick Start](docs/quickstart.md) for the full walkthrough, including manual registration, the admin list, and password change.

## Example Application

`example_applications/usermanagement_demo/` is a full Pict app that installs the section against an in-browser mock backend (no server needed), with a tab strip gated by session and admin role. Build it with `npm run build` and open `dist/index.html`, or run `node smoke.js` for a headless jsdom walkthrough. Seed logins: `admin / admin` (admin) and `alice / wonderland` (regular user).

## Testing

```bash
npm test
```

## Documentation

- [Overview](docs/README.md)
- [Quick Start](docs/quickstart.md)
- [Architecture](docs/architecture.md)
- [API & Usage](docs/api-and-usage.md)

## Related Modules

- [pict](https://github.com/fable-retold/pict) -- The application framework this section plugs into.
- [pict-view](https://github.com/fable-retold/pict-view) -- Base class for all five views.
- [pict-provider](https://github.com/fable-retold/pict-provider) -- Base class for the REST provider.
- [pict-section-login](https://github.com/fable-retold/pict-section-login) -- Lighter, login-only alternative.
- [pict-section-modal](https://github.com/fable-retold/pict-section-modal) -- Confirms / prompts / toasts used by the UserList view.
- [orator-authentication](https://github.com/fable-retold/orator-authentication) -- The session backend.
- [ultravisor-auth-beacon](https://github.com/stevenvelozo/ultravisor-auth-beacon) -- The `/Users` CRUD backend.

## License

MIT
