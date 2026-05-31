# Pict Section UserManagement

> User-management UI for Pict applications — login, current-user badge, admin user list/edit, and self-service password change.

Pict Section UserManagement is a section module: one provider plus five views that together cover the common user-account surface of an authenticated web application. It is backed by [orator-authentication](https://fable-retold.github.io/orator-authentication/)'s session routes (`Authenticate` / `Deauthenticate` / `CheckSession`) and the [ultravisor-auth-beacon](https://stevenvelozo.github.io/ultravisor-auth-beacon/) `/Users` CRUD surface.

The module ships:

- **A REST provider** (`Pict-Provider-UserManagement`) that owns all network I/O and writes results into `pict.AppData.UserManagement` for the views to render.
- **A Login view** — username + password form that calls `provider.login(...)`.
- **A CurrentUser view** — a compact session badge (initials avatar, name, roles, "Sign out") for a top bar; renders nothing when logged out.
- **A UserList view** — admin table of users with search, refresh, "New user", and per-row Edit / Reset-password / Delete actions.
- **A UserEdit view** — a create-or-update form driven by `AppData.UserManagement.CreateMode` / `SelectedUser`.
- **A PasswordChange view** — current / new / confirm self-service password change for the logged-in session.
- **A shared CSS design system** registered by the provider, themable through `--pict-um-*` and `--theme-color-*` custom properties.

A one-shot `install(pict, options)` helper registers the provider and any subset of views under their default hashes. Views never fetch on their own — every call goes through the provider, and the provider keeps `AppData.UserManagement` current.

## Features

- **Provider + Views split** — One provider does the REST I/O; five views render from `AppData`. Register what you need.
- **orator-authentication session routes** — `login` / `logout` / `checkSession` map to `POST Authenticate` / `POST Deauthenticate` / `GET CheckSession`.
- **auth-beacon /Users CRUD** — `loadUsers`, `getUser`, `createUser`, `updateUser`, `deleteUser`, `setUserPassword`, and `changePassword` map to the beacon's `/Users` and `/User/:id` surface.
- **AppData-driven** — Session, user list, selected user, last error, and loading flags all live under `pict.AppData.UserManagement` so any view or host code can read them.
- **Configurable transport** — A `BaseURL` (default `/1.0/`) prefixes every path, and a `Fetcher` slot lets you inject a mock or a custom transport (the default uses `globalThis.fetch` with `credentials: 'same-origin'`).
- **Cookie-session friendly** — All requests ride the browser session cookie; the module never touches `localStorage` or `sessionStorage`.
- **Host hooks** — `OnLogin`, `OnLogout`, `OnEditUser`, and `OnNewUser` view options let the host re-flow its layout without subscribing to `AppData`.
- **Role awareness** — `isLoggedIn()` and `isAdmin()` convenience guards (the admin role name is the `AdminRole` option, default `admin`).
- **Modal-aware** — Destructive UserList actions use `pict-section-modal` for confirmation, prompts, and toasts (per Pict conventions).
- **Themable** — A single shared stylesheet with `.pict-um-*` classes, registered at priority 500 so host apps can override it.

## When to Use It

Reach for this section when a Pict application needs:

- A sign-in form plus a persistent "who am I / sign out" badge.
- An admin screen to list, search, create, edit, and delete user accounts against an auth-beacon backend.
- A self-service "change my password" form.
- A client that talks to `orator-authentication` sessions and the `/Users` CRUD endpoints without hand-writing the fetch layer.

If you only need a login form (no user administration, no current-user badge), [pict-section-login](https://fable-retold.github.io/pict-section-login/) is the lighter single-view option.

## Learn More

- [Quick Start](quickstart.md) — Install, register the provider + views, and wire the mount points.
- [Architecture](architecture.md) — Provider/view split, the `AppData` contract, and the REST surface.
- [API & Usage](api-and-usage.md) — Every provider method, view option, and host hook, with code snippets.

## Related Modules

- [pict](https://fable-retold.github.io/pict/) — The application framework this section plugs into.
- [pict-view](https://fable-retold.github.io/pict-view/) — Base class for all five views.
- [pict-provider](https://fable-retold.github.io/pict-provider/) — Base class for the REST provider.
- [pict-section-login](https://fable-retold.github.io/pict-section-login/) — Lighter, login-only alternative.
- [pict-section-modal](https://fable-retold.github.io/pict-section-modal/) — Confirms / prompts / toasts used by the UserList view.
- [orator-authentication](https://fable-retold.github.io/orator-authentication/) — The session backend (`Authenticate` / `Deauthenticate` / `CheckSession`).
- [ultravisor-auth-beacon](https://stevenvelozo.github.io/ultravisor-auth-beacon/) — The `/Users` CRUD backend.
