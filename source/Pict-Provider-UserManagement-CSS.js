module.exports = /*css*/`
/* ────────────────────────────────────────────────────────────
 * pict-section-usermanagement
 * Shared visual language across Login / CurrentUser / UserList /
 * UserEdit / PasswordChange. Lives at priority 500 (default) so
 * host apps can override individual selectors at higher priority.
 * ──────────────────────────────────────────────────────────── */

.pict-um-card {
	max-width: 420px; margin: 32px auto; padding: 24px 28px;
	background: var(--pict-um-bg, var(--theme-color-background-panel, #ffffff));
	color: var(--pict-um-fg, var(--theme-color-text-primary, #1f2933));
	border: 1px solid var(--pict-um-border, var(--theme-color-border-default, #e2e6ec));
	border-radius: 10px;
	box-shadow: 0 4px 12px rgba(0,0,0,0.06);
	font-family: var(--pict-um-font, var(--theme-typography-family-sans, system-ui, -apple-system, sans-serif));
}
.pict-um-card-wide { max-width: 720px; }

.pict-um-h1 { margin: 0 0 16px; font-size: 22px; font-weight: 600; }
.pict-um-h2 { margin: 0 0 10px; font-size: 16px; font-weight: 600; color: var(--pict-um-muted, var(--theme-color-text-muted, #4a5568)); }
.pict-um-sub { color: var(--pict-um-muted, var(--theme-color-text-muted, #4a5568)); font-size: 13px; margin-bottom: 18px; }

.pict-um-field { display: block; margin-bottom: 14px; }
.pict-um-label { display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px;
	color: var(--pict-um-muted, var(--theme-color-text-muted, #4a5568)); text-transform: uppercase; letter-spacing: 0.4px; }
.pict-um-input {
	width: 100%; box-sizing: border-box;
	padding: 8px 10px; border-radius: 6px; font-size: 13px;
	border: 1px solid var(--pict-um-border, var(--theme-color-border-default, #cfd5dd));
	background: var(--pict-um-input-bg, var(--theme-color-background-secondary, #fbfbfc));
	color: var(--pict-um-fg, var(--theme-color-text-primary, #1f2933));
}
.pict-um-input:focus {
	outline: none; border-color: var(--pict-um-accent, var(--theme-color-brand-primary, #2563eb));
	box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
}

.pict-um-actions { display: flex; gap: 8px; justify-content: flex-end;
	margin-top: 18px; flex-wrap: wrap; }
.pict-um-btn {
	padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;
	border: 1px solid var(--pict-um-border, var(--theme-color-border-default, #cfd5dd));
	background: var(--pict-um-input-bg, var(--theme-color-background-secondary, #fbfbfc));
	color: var(--pict-um-fg, var(--theme-color-text-primary, #1f2933));
	cursor: pointer; user-select: none;
}
.pict-um-btn:hover { border-color: var(--pict-um-accent, var(--theme-color-brand-primary, #2563eb)); color: var(--pict-um-accent, var(--theme-color-brand-primary, #2563eb)); }
.pict-um-btn-primary {
	background: var(--pict-um-accent, var(--theme-color-brand-primary, #2563eb)); color: var(--theme-color-background-panel, #fff); border-color: var(--pict-um-accent, var(--theme-color-brand-primary, #2563eb));
}
.pict-um-btn-primary:hover { background: var(--theme-color-brand-primary-hover, #1e54cc); color: var(--theme-color-text-on-brand, #fff); }
.pict-um-btn-danger {
	background: var(--theme-color-background-tertiary, #fef2f2); color: var(--theme-color-status-error, #b91c1c); border-color: var(--theme-color-status-error, #fca5a5);
}
.pict-um-btn-danger:hover { background: var(--theme-color-background-tertiary, #fee2e2); }
.pict-um-btn-sm { padding: 4px 10px; font-size: 11px; }

.pict-um-message {
	padding: 8px 12px; border-radius: 6px; margin-top: 10px;
	font-size: 12px; line-height: 1.4;
}
.pict-um-message-error   { background: var(--theme-color-background-tertiary, #fef2f2); color: var(--theme-color-status-error,   #b91c1c); border: 1px solid var(--theme-color-status-error,   #fca5a5); }
.pict-um-message-success { background: var(--theme-color-background-tertiary, #f0fdf4); color: var(--theme-color-status-success, #166534); border: 1px solid var(--theme-color-status-success, #86efac); }

/* CurrentUser badge — compact display + logout */
.pict-um-currentuser {
	display: inline-flex; align-items: center; gap: 10px;
	padding: 4px 10px; border-radius: 999px;
	background: var(--pict-um-input-bg, var(--theme-color-background-secondary, #fbfbfc));
	border: 1px solid var(--pict-um-border, var(--theme-color-border-default, #e2e6ec));
	font-size: 12px;
}
.pict-um-currentuser-avatar {
	display: inline-flex; align-items: center; justify-content: center;
	width: 22px; height: 22px; border-radius: 50%;
	background: var(--pict-um-accent, var(--theme-color-brand-primary, #2563eb)); color: var(--theme-color-background-panel, #fff);
	font-size: 10px; font-weight: 700;
}
.pict-um-currentuser-name { font-weight: 500; }
.pict-um-currentuser-roles { color: var(--pict-um-muted, var(--theme-color-text-muted, #4a5568)); font-size: 11px; }
.pict-um-currentuser-logout {
	padding: 2px 10px; font-size: 11px; cursor: pointer;
	border: 0; background: transparent; color: var(--pict-um-muted, var(--theme-color-text-muted, #4a5568));
}
.pict-um-currentuser-logout:hover { color: var(--pict-um-accent, var(--theme-color-brand-primary, #2563eb)); }

/* UserList table */
.pict-um-toolbar {
	display: flex; align-items: center; gap: 10px;
	margin-bottom: 12px;
}
.pict-um-search { flex: 1; }
.pict-um-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pict-um-table thead th {
	font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
	color: var(--pict-um-muted, var(--theme-color-text-muted, #4a5568)); font-weight: 600;
	padding: 8px 10px; border-bottom: 1px solid var(--pict-um-border, var(--theme-color-border-default, #e2e6ec)); text-align: left;
}
.pict-um-table tbody td {
	padding: 8px 10px; border-bottom: 1px solid var(--pict-um-border-soft, #f0f3f7);
	vertical-align: middle;
}
.pict-um-table tbody tr:hover { background: var(--pict-um-input-bg, var(--theme-color-background-secondary, #fbfbfc)); }
.pict-um-pill {
	display: inline-block; padding: 2px 8px; border-radius: 999px;
	font-size: 11px; background: var(--pict-um-pill-bg, #eef2f7); margin-right: 4px;
}
.pict-um-pill-admin { background: var(--theme-color-status-warning, #fef3c7); color: var(--theme-color-status-warning, #92400e); }

.pict-um-empty { color: var(--pict-um-muted, var(--theme-color-text-muted, #4a5568)); font-style: italic; padding: 24px 8px; }
`;
