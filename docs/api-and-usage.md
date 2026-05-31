# API & Usage

Every developer-facing export, provider method, view option, and host hook. Signatures follow the source in `source/`.

## Module Exports

`require('pict-section-usermanagement')` returns the **provider class** (also available as `.Provider`). The full export surface:

| Export | What it is |
|---|---|
| (default) / `.Provider` | `PictUserManagementProvider` class |
| `.LoginView` | Login view class |
| `.CurrentUserView` | CurrentUser badge view class |
| `.UserListView` | Admin user-list view class |
| `.UserEditView` | Create/update user view class |
| `.PasswordChangeView` | Self-service password-change view class |
| `.install` | `install(pict, options)` convenience registrar |

Each class also exposes `.default_configuration`.

## install(pict, options)

Registers the provider and a subset of views, merging your options over each piece's defaults.

| Param | Type | Description |
|---|---|---|
| `pict` | `Pict` | A Pict instance. Throws if it has no `addProvider`. |
| `options.ProviderOptions` | `object` | Merged over the provider's `default_configuration`. |
| `options.Views` | `string[]` | Subset of `Login`, `CurrentUser`, `UserList`, `UserEdit`, `PasswordChange`. Defaults to all. Unknown names warn and skip. |
| `options.ViewOptions` | `object` | Per-view overrides keyed by the same shortnames. |

```javascript
require('pict-section-usermanagement').install(pict,
	{
		ProviderOptions: { "BaseURL": "/1.0/" },
		Views: [ "Login", "CurrentUser", "UserList", "UserEdit", "PasswordChange" ],
		ViewOptions:
		{
			Login:       { OnLogin:  (pResult) => { /* re-paint shell */ } },
			CurrentUser: { OnLogout: () => { /* re-paint shell */ } }
		}
	});
```

The view hashes registered by `install` are `PictUM-Login`, `PictUM-CurrentUser`, `PictUM-UserList`, `PictUM-UserEdit`, and `PictUM-PasswordChange`. The provider hash is `Pict-UserManagement-Provider`.

## Provider Configuration

Passed as `ProviderOptions` (via `install`) or as the options object to `addProvider`.

| Key | Default | Description |
|---|---|---|
| `ProviderIdentifier` | `'Pict-UserManagement-Provider'` | Provider hash. |
| `BaseURL` | `'/1.0/'` | Prefix for every REST path. |
| `Fetcher` | `globalThis.fetch` | Transport `(path, opts) => Promise<{ ok, status, json() }>`. Inject a mock or wrapper here. |
| `AdminRole` | `'admin'` | Role name that `isAdmin()` checks for. |
| `AutoInitialize` | `true` | Standard pict-provider flag. |
| `AutoSolveWithApp` | `false` | Standard pict-provider flag. |

## Provider Methods

Every method returns a `Promise` **and** accepts an optional Node-style `fCallback(error, result)`. On success the relevant `AppData.UserManagement` key is updated; on failure `AppData.UserManagement.LastError` is set. Methods that mutate also toggle `Loading.Mutating`.

### `checkSession(fCallback)`

`GET CheckSession`. Always sets `CurrentUser` (to the response body, or `{ LoggedIn: false }` on failure). Use at app boot to decide between the login view and the main UI.

```javascript
provider.checkSession((pError, pUser) =>
{
	// pUser.LoggedIn tells you which UI to show
});
```

### `login(pUsername, pPassword, fCallback)`

`POST Authenticate` with body `{ UserName, Password }`. On `LoggedIn: true`, sets `CurrentUser` and clears the login error. A response with falsy `LoggedIn` calls back with an `Error` carrying the server's `Error` string (and records it to `LastError`).

```javascript
provider.login('admin', 'admin', (pError, pBody) =>
{
	if (pError) { /* show pError.message */ return; }
	// pBody.LoggedIn === true
});
```

### `logout(fCallback)`

`POST Deauthenticate`. Clears `CurrentUser` to `{ LoggedIn: false }` **whether or not the call succeeds**.

### `loadUsers(pSearch, fCallback)`

`GET Users`, optionally `?search=<term>`. Stores the returned `Users` array at `AllUsers`. `pSearch` may be omitted — `loadUsers(fCallback)` is accepted for the no-search case.

```javascript
provider.loadUsers('ali', (pError, pUsers) => { /* pUsers is the filtered list */ });
provider.loadUsers((pError, pUsers) => { /* all users */ });
```

### `createUser(pSpec, fCallback)`

`POST Users` with `pSpec`. The bundled UserEdit form sends `{ Username, Password, FullName, Email, Roles }`. Returns the response body.

### `getUser(pUserID, fCallback)`

`GET User/:id`. Stores the returned `User` at `SelectedUser` and calls back with it (or `null`).

### `updateUser(pUserID, pUpdates, fCallback)`

`PUT User/:id` with a partial `pUpdates` object. The UserEdit form sends only the fields that changed.

### `deleteUser(pUserID, fCallback)`

`DELETE User/:id`.

### `setUserPassword(pUserID, pNewPassword, fCallback)`

`POST User/:id/SetPassword` with `{ NewPassword }`. Admin action — sets another user's password without their current one. Used by the UserList "Reset password" action.

### `changePassword(pCurrentPassword, pNewPassword, fCallback)`

`POST Me/ChangePassword` with `{ CurrentPassword, NewPassword }`. Self-service — the backend resolves the target from the session cookie.

## Provider Read Accessors

Synchronous convenience reads over `AppData.UserManagement`:

| Method | Returns |
|---|---|
| `currentUser()` | The `CurrentUser` object, or `{ LoggedIn: false }`. |
| `isLoggedIn()` | `true` when `CurrentUser.LoggedIn` is truthy. |
| `isAdmin()` | `true` when logged in and the user's `Roles` (on `UserRecord` or the top-level object) include `AdminRole`. |

## Views

All five views extend `pict-view`, share these conventions, and resolve the provider through `options.ProviderHash`:

- `AutoInitialize: true`, `AutoRender: false` — the host (or a layout view) calls `render()`.
- Each has a `DefaultDestinationAddress` and renders into a fixed DOM id (below).
- `CSSPriority: 500`.

| View | Hash | Mount id | Reads | Calls |
|---|---|---|---|---|
| Login | `PictUM-Login` | `#PictUM-Login` | — | `login` |
| CurrentUser | `PictUM-CurrentUser` | `#PictUM-CurrentUser` | `CurrentUser` | `logout`, `currentUser` |
| UserList | `PictUM-UserList` | `#PictUM-UserList` | `AllUsers` | `loadUsers`, `deleteUser`, `setUserPassword` |
| UserEdit | `PictUM-UserEdit` | `#PictUM-UserEdit` | `CreateMode`, `SelectedUser` | `createUser`, `updateUser`, `loadUsers` |
| PasswordChange | `PictUM-PasswordChange` | `#PictUM-PasswordChange` | — | `changePassword` |

### Login view

Renders a username + password form. Validates both fields are non-empty client-side, disables the submit button while in flight, and shows an inline success or error message. On a successful login it clears the password field and calls the `OnLogin` hook. The view never navigates.

| Option | Type | Description |
|---|---|---|
| `OnLogin(pResult)` | `function` | Called after a successful login with the session body. Use it to re-paint the host shell. Errors thrown inside are swallowed. |

### CurrentUser view

A compact session badge: an initials avatar, the display name (`UserRecord.FullName` → `LoginID` → `Username` → `UserID`), a roles label, and a "Sign out" button. Renders **nothing** when not logged in, so it can sit in a top bar unconditionally. Clicking "Sign out" calls `provider.logout()`, re-renders (dropping the badge), then calls the `OnLogout` hook.

| Option | Type | Description |
|---|---|---|
| `OnLogout()` | `function` | Called after logout completes and the badge has re-rendered. Errors thrown inside are swallowed. |

### UserList view

An admin table (Username / Roles / Email / actions) plus a toolbar with a debounced search box (250 ms), a Refresh button, and a "New user" button. Renders from `AppData.UserManagement.AllUsers` and shows an empty-state message when the list is empty. The admin role pill is highlighted.

Per-row actions:

- **Edit** — calls `OnEditUser(user)` if provided; otherwise writes a copy of the user to `AppData.UserManagement.SelectedUser`.
- **Reset password** — opens a `pict-section-modal` prompt with a password input, then calls `setUserPassword(userID, newPassword)`; reports via toast.
- **Delete** — confirms via `pict-section-modal` (`dangerous: true`), then calls `deleteUser(userID)`, refreshes the list, and toasts. With no modal installed it proceeds without confirmation.

The toolbar's **New user** calls `OnNewUser()` if provided; otherwise sets `SelectedUser = null` and `CreateMode = true` so the UserEdit view opens its create form.

| Option | Type | Description |
|---|---|---|
| `OnEditUser(pUser)` | `function` | Override the default "write to `SelectedUser`" behavior for the Edit action. |
| `OnNewUser()` | `function` | Override the default "set `CreateMode`" behavior for the New-user button. |

> The view does not call `loadUsers()` itself — the host loads the list when the view mounts. Refresh and search call `loadUsers()` after that.

### UserEdit view

A create-or-update form with three modes resolved at render time from `AppData.UserManagement`:

1. `CreateMode === true` → empty form; submit calls `createUser(spec)`.
2. `SelectedUser` set → prefilled form; submit calls `updateUser(id, updates)` with only the changed fields.
3. Neither → renders nothing.

Fields: Username, Full name, Email, Roles (comma-separated), and (create mode only) Password. Create requires Username + Password. Update sends a minimal diff and reports "No changes to save." when nothing changed. On success it clears `CreateMode` / `SelectedUser`, calls `provider.loadUsers()` to refresh the list, toasts, and re-renders to the empty state. A Cancel button clears the edit state and re-renders.

This view takes no host-hook options.

### PasswordChange view

Self-service form: current password, new password, confirm new password. Validates that all three are filled, that new matches confirm, and that new differs from current, then calls `changePassword(current, new)`. On success it shows a confirmation ("Password updated. Other sessions have been signed out.") and clears the fields. Renders nothing meaningful if there is no session — guard at the host level for a hard "must be logged in" gate.

This view takes no host-hook options.

## Styling

The provider registers one stylesheet (`Pict-UserManagement-CSS`) at priority 500 via `pict.CSSMap.addCSS`. All classes are prefixed `.pict-um-*` (card, field/label/input, btn variants, message strips, the current-user badge, the table, pills, empty state). Colors come from `--pict-um-*` custom properties that fall back to `--theme-color-*` tokens and finally to hardcoded hex, so:

- A host theme that defines `--theme-color-*` tokens recolors the section automatically.
- A host can override a specific `--pict-um-*` variable (e.g. `--pict-um-accent`) to retint just this section.
- A host can register higher-priority CSS to override individual `.pict-um-*` rules.

## Backend Contract Summary

The provider expects an `orator-authentication`-style session API plus an auth-beacon `/Users` surface, all under `BaseURL`:

| Path | Method | Request | Success body |
|---|---|---|---|
| `CheckSession` | GET | — | `{ LoggedIn, UserID, UserRecord }` or `{ LoggedIn:false }` |
| `Authenticate` | POST | `{ UserName, Password }` | `{ LoggedIn, UserID, UserRecord }` |
| `Deauthenticate` | POST | — | (any) |
| `Users` | GET | `?search=` (optional) | `{ Users: [...] }` |
| `Users` | POST | user spec | created user / `{ Success, Reason }` |
| `User/:id` | GET | — | `{ User: {...} }` |
| `User/:id` | PUT | partial updates | updated user / `{ Success, Reason }` |
| `User/:id` | DELETE | — | (any) |
| `User/:id/SetPassword` | POST | `{ NewPassword }` | (any) |
| `Me/ChangePassword` | POST | `{ CurrentPassword, NewPassword }` | (any) |

The bundled demo's `MockAuthFetcher.js` implements this surface in-browser (with the same status codes and body shapes) and is the most concrete reference for the contract; the real backend is [ultravisor-auth-beacon](https://stevenvelozo.github.io/ultravisor-auth-beacon/).

## Example Application

`example_applications/usermanagement_demo/` is a full Pict app that installs the section against an in-browser mock backend, with a tab strip (Sign in / Users / Change password) gated by session + admin role. Build it with `npm run build` (`quack build` + `quack copy`) and open `dist/index.html`; `node smoke.js` runs a headless jsdom walkthrough of every flow. Seed logins: `admin / admin` (admin) and `alice / wonderland` (regular user). Refreshing the page logs you out — the mock keeps sessions in a single in-memory variable.
