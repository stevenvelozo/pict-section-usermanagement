# Quick Start

This guide walks through a minimal integration of `pict-section-usermanagement` into a Pict application.

## 1. Install

```bash
npm install pict-section-usermanagement
```

The runtime dependencies are `pict-provider` and `pict-view`, both of which a Pict application already has. The UserList view's confirm / prompt / toast affordances expect [pict-section-modal](https://fable-retold.github.io/pict-section-modal/) to be registered under the hash `Pict-Section-Modal` (see step 5).

## 2. Provide Mount Points

Each view renders into a fixed DOM id (the `ContentDestinationAddress` in each view's renderable). Drop the ones you intend to use into your page or layout template:

```html
<span id="PictUM-CurrentUser"></span>
<div id="PictUM-Login"></div>
<div id="PictUM-UserList"></div>
<div id="PictUM-UserEdit"></div>
<div id="PictUM-PasswordChange"></div>
```

You only need the mounts for the views you register.

## 3. Register With the install() Helper

The fastest path is the `install` helper. It calls `addProvider` once and `addView` for each requested view, merging your options over each piece's `default_configuration`:

```javascript
const libPict = require('pict');
const libPictSectionUserManagement = require('pict-section-usermanagement');

const _Pict = new libPict();

libPictSectionUserManagement.install(_Pict,
	{
		ProviderOptions:
		{
			"BaseURL": "/1.0/"
		}
	});
```

`install(pict, options)` accepts:

| Option | Type | Description |
|---|---|---|
| `ProviderOptions` | `object` | Merged over the provider's defaults (`BaseURL`, `Fetcher`, `AdminRole`). |
| `Views` | `string[]` | Subset of view shortnames to register: `Login`, `CurrentUser`, `UserList`, `UserEdit`, `PasswordChange`. Defaults to all five. Unknown names are warned-and-skipped. |
| `ViewOptions` | `object` | Per-view option overrides keyed by the same shortnames, e.g. `{ Login: { OnLogin: fn } }`. |

Registering only a subset:

```javascript
libPictSectionUserManagement.install(_Pict,
	{
		ProviderOptions: { "BaseURL": "/myapi/" },
		Views: [ "Login", "CurrentUser" ]
	});
```

## 4. Register Manually (Optional)

If you already have a boot flow, register each piece yourself using the named exports. This is exactly what `install` does internally:

```javascript
const um = require('pict-section-usermanagement');

_Pict.addProvider('Pict-UserManagement-Provider',
	um.Provider.default_configuration, um.Provider);

_Pict.addView('PictUM-Login',
	um.LoginView.default_configuration, um.LoginView);
_Pict.addView('PictUM-CurrentUser',
	um.CurrentUserView.default_configuration, um.CurrentUserView);
_Pict.addView('PictUM-UserList',
	um.UserListView.default_configuration, um.UserListView);
_Pict.addView('PictUM-UserEdit',
	um.UserEditView.default_configuration, um.UserEditView);
_Pict.addView('PictUM-PasswordChange',
	um.PasswordChangeView.default_configuration, um.PasswordChangeView);
```

The named exports are `Provider`, `LoginView`, `CurrentUserView`, `UserListView`, `UserEditView`, and `PasswordChangeView`. The module's default export (`require('pict-section-usermanagement')`) is the provider class itself.

## 5. Register the Modal Section

The UserList view's Delete and Reset-password actions call `pict-section-modal` for confirmation and prompts, and several views use its `toast()` for status. Register it under the conventional hash before rendering:

```javascript
const libPictSectionModal = require('pict-section-modal');
_Pict.addView('Pict-Section-Modal', {}, libPictSectionModal);
```

If the modal is not present, Delete proceeds without a confirmation prompt and toasts are silently skipped — so installing it is strongly recommended.

## 6. Check the Session on Boot

The provider does not auto-fetch. Call `checkSession()` when the app starts so the views know whether a session is already active:

```javascript
const tmpProvider = _Pict.providers['Pict-UserManagement-Provider'];

tmpProvider.checkSession((pError, pCurrentUser) =>
{
	// pCurrentUser is { LoggedIn: true, UserID, UserRecord: {...} }
	// or { LoggedIn: false }. AppData.UserManagement.CurrentUser is
	// updated either way; re-render whichever views are visible.
	_Pict.views['PictUM-CurrentUser'].render();
	if (!tmpProvider.isLoggedIn())
	{
		_Pict.views['PictUM-Login'].render();
	}
});
```

## 7. Render the Login Form

The Login view renders a username + password form. On submit it calls `provider.login(...)`; on success `AppData.UserManagement.CurrentUser` flips to `LoggedIn: true`. The view does not navigate — use the `OnLogin` hook (or subscribe to the store) to swap in the rest of your UI:

```javascript
_Pict.addView('PictUM-Login',
	Object.assign({}, um.LoginView.default_configuration,
		{
			"OnLogin": (pResult) =>
			{
				// pResult is the session body; re-paint the app shell here.
				_Pict.views['PictUM-CurrentUser'].render();
			}
		}),
	um.LoginView);

_Pict.views['PictUM-Login'].render();
```

## 8. Render the Admin User List

The UserList view renders from `AppData.UserManagement.AllUsers`. The view does not load on its own — call `loadUsers()` when the list mounts (the view's Refresh button and search box call it for you afterward):

```javascript
tmpProvider.loadUsers((pError, pUsers) =>
{
	_Pict.views['PictUM-UserList'].render();
});
```

By default a row's **Edit** button writes the user to `AppData.UserManagement.SelectedUser`, and **New user** sets `CreateMode = true`. The UserEdit view reads those to render its create / update form. Supply `OnEditUser(user)` / `OnNewUser()` view options if you'd rather route those events yourself (e.g. open a separate panel or navigate).

## 9. Render the Password-Change Form

The PasswordChange view is self-service for the current session — the backend resolves the target user from the session cookie, so the view never needs a `UserID`:

```javascript
_Pict.views['PictUM-PasswordChange'].render();
```

It validates that all three fields are filled, that the new password and confirmation match, and that the new password differs from the current one, then calls `provider.changePassword(current, new)`.

## 10. Read the Session From Anywhere

Everything the provider fetches is mirrored to `AppData`:

```javascript
const tmpUM = _Pict.AppData.UserManagement;

if (tmpUM.CurrentUser.LoggedIn)
{
	const tmpUserID = tmpUM.CurrentUser.UserID;
	const tmpRecord = tmpUM.CurrentUser.UserRecord;   // { LoginID, Roles, FullName, Email, ... }
}
```

The provider also exposes `currentUser()`, `isLoggedIn()`, and `isAdmin()` as convenience reads.

## Next Steps

- [Architecture](architecture.md) — the provider/view split, the `AppData` contract, and the full REST surface.
- [API & Usage](api-and-usage.md) — every provider method, view option, and host hook.
