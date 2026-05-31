# Pict Section UserManagement

> User-management UI for Pict applications

A provider plus five views that cover the common user-account surface of an authenticated app — login, a current-user badge, an admin user list/edit, and self-service password change. Backed by orator-authentication sessions and the auth-beacon `/Users` CRUD endpoints.

- **Provider + Views** -- One REST provider does the I/O; five views render from `AppData`
- **Session Routes** -- `login` / `logout` / `checkSession` map to Authenticate / Deauthenticate / CheckSession
- **/Users CRUD** -- list, create, edit, delete, reset-password, and self-change-password
- **AppData-Driven** -- Session, user list, selected user, errors, and loading flags all under `AppData.UserManagement`
- **Configurable Transport** -- `BaseURL` prefix and a pluggable `Fetcher` for mocks or custom transports
- **Host Hooks** -- `OnLogin`, `OnLogout`, `OnEditUser`, `OnNewUser` for layout re-flow
- **Themable** -- `.pict-um-*` design system driven by theme tokens

[Overview](README.md)
[Quick Start](quickstart.md)
[Architecture](architecture.md)
[GitHub](https://github.com/fable-retold/pict-section-usermanagement)
