/**
 * Pict-Provider-UserManagement
 *
 * Browser-side REST client for the orator-authentication session
 * surface plus the auth-beacon-backed /Users CRUD endpoints. The
 * provider does the network I/O and writes results into pict.AppData
 * keys that views subscribe to for re-render. Views NEVER fetch on
 * their own — every API call goes through here.
 *
 * AppData layout (host applications can read these too):
 *   pict.AppData.UserManagement = {
 *       CurrentUser: { LoggedIn, UserID, Username, Roles, ... } | { LoggedIn:false },
 *       AllUsers: [ {UserID, Username, Roles, Email, ...}, ... ],
 *       SelectedUser: {...} | null,           // for the edit view
 *       LastError: { Action, Message, Status } | null,
 *       Loading: { CurrentUser:false, AllUsers:false, ... }
 *   };
 *
 * Config (constructor options or fable settings):
 *   BaseURL: '/1.0/'                        — REST root for the API
 *   Fetcher: function(pPath, pOpts) → Promise<Response>
 *                                          — optional custom transport
 *   AdminRole: 'admin'                      — role name considered admin
 *
 * Why a custom Fetcher slot?
 * ==========================
 * The Pict module runs in browsers AND in test harnesses where
 * `fetch` may not be present (or where you want to inject a mock).
 * Default uses `globalThis.fetch`. Any callable that returns a
 * Promise<{ok, status, json()}>-shaped response works.
 */

const libPictProvider = require('pict-provider');

const _DefaultConfiguration =
{
	ProviderIdentifier: 'Pict-UserManagement-Provider',
	AutoInitialize: true,
	AutoSolveWithApp: false,

	BaseURL: '/1.0/',
	AdminRole: 'admin'
};

class PictUserManagementProvider extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, _DefaultConfiguration, pOptions || {});
		super(pFable, tmpOptions, pServiceHash);

		this._BaseURL = tmpOptions.BaseURL;
		this._Fetcher = (typeof tmpOptions.Fetcher === 'function')
			? tmpOptions.Fetcher
			: ((typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function')
				? globalThis.fetch.bind(globalThis)
				: null);
		this._AdminRole = tmpOptions.AdminRole;

		// Seed the AppData container synchronously so views that mount
		// before the first /CheckSession can render an empty-but-valid
		// state without null-checking everything.
		if (this.pict && this.pict.AppData)
		{
			if (!this.pict.AppData.UserManagement)
			{
				this.pict.AppData.UserManagement = {};
			}
			let tmpAD = this.pict.AppData.UserManagement;
			if (!tmpAD.CurrentUser) tmpAD.CurrentUser = { LoggedIn: false };
			if (!tmpAD.AllUsers) tmpAD.AllUsers = [];
			if (!tmpAD.SelectedUser) tmpAD.SelectedUser = null;
			if (!tmpAD.LastError) tmpAD.LastError = null;
			if (!tmpAD.Loading)
			{
				tmpAD.Loading =
				{
					CurrentUser: false,
					AllUsers: false,
					Mutating: false
				};
			}
		}

		// CSS — providers don't get auto-registration, do it explicitly.
		if (this.pict && this.pict.CSSMap && typeof this.pict.CSSMap.addCSS === 'function')
		{
			let libCSS = require('./Pict-Provider-UserManagement-CSS.js');
			this.pict.CSSMap.addCSS('Pict-UserManagement-CSS', libCSS, 500);
		}
	}

	// =========================================================
	// Public API — async via callback (fable convention) AND
	// returns a Promise so callers can await as well. Every call
	// updates AppData and notifies the store; callbacks are
	// optional for sites that prefer to react to AppData changes.
	// =========================================================

	/**
	 * Resolve the current session by calling /CheckSession. Always
	 * updates AppData.UserManagement.CurrentUser, even on failure
	 * (sets LoggedIn:false). Useful at app boot to decide whether
	 * to show the login view or the main UI.
	 */
	checkSession(fCallback)
	{
		this._setLoading('CurrentUser', true);
		return this._call('GET', 'CheckSession', null)
			.then((pResp) =>
			{
				let tmpUser = (pResp && pResp.body) || {};
				this._setCurrentUser(tmpUser);
				this._setLoading('CurrentUser', false);
				if (fCallback) fCallback(null, tmpUser);
				return tmpUser;
			})
			.catch((pErr) =>
			{
				this._setCurrentUser({ LoggedIn: false });
				this._setLoading('CurrentUser', false);
				this._setError('checkSession', pErr);
				if (fCallback) fCallback(pErr);
				throw pErr;
			});
	}

	login(pUsername, pPassword, fCallback)
	{
		this._setLoading('CurrentUser', true);
		return this._call('POST', 'Authenticate',
			{ UserName: pUsername, Password: pPassword })
			.then((pResp) =>
			{
				let tmpBody = (pResp && pResp.body) || {};
				if (!tmpBody.LoggedIn)
				{
					this._setLoading('CurrentUser', false);
					let tmpErr = new Error(tmpBody.Error || 'Login failed');
					tmpErr._reason = tmpBody.Error;
					this._setError('login', tmpErr);
					if (fCallback) fCallback(tmpErr);
					return tmpBody;
				}
				this._setCurrentUser(tmpBody);
				this._setLoading('CurrentUser', false);
				this._setError('login', null);
				if (fCallback) fCallback(null, tmpBody);
				return tmpBody;
			})
			.catch((pErr) =>
			{
				this._setLoading('CurrentUser', false);
				this._setError('login', pErr);
				if (fCallback) fCallback(pErr);
				throw pErr;
			});
	}

	logout(fCallback)
	{
		return this._call('POST', 'Deauthenticate', null)
			.then((pResp) =>
			{
				this._setCurrentUser({ LoggedIn: false });
				if (fCallback) fCallback(null, pResp && pResp.body);
				return pResp && pResp.body;
			})
			.catch((pErr) =>
			{
				// Even if the call fails, clear local state — the user
				// asked to log out, they shouldn't see a stale session.
				this._setCurrentUser({ LoggedIn: false });
				this._setError('logout', pErr);
				if (fCallback) fCallback(pErr);
				throw pErr;
			});
	}

	loadUsers(pSearch, fCallback)
	{
		// Allow loadUsers(fCallback) for the common no-search case.
		if (typeof pSearch === 'function')
		{
			fCallback = pSearch;
			pSearch = null;
		}
		this._setLoading('AllUsers', true);
		let tmpQS = pSearch ? '?search=' + encodeURIComponent(pSearch) : '';
		return this._call('GET', 'Users' + tmpQS, null)
			.then((pResp) =>
			{
				let tmpUsers = (pResp && pResp.body && pResp.body.Users) || [];
				this._setUsers(tmpUsers);
				this._setLoading('AllUsers', false);
				this._setError('loadUsers', null);
				if (fCallback) fCallback(null, tmpUsers);
				return tmpUsers;
			})
			.catch((pErr) =>
			{
				this._setLoading('AllUsers', false);
				this._setError('loadUsers', pErr);
				if (fCallback) fCallback(pErr);
				throw pErr;
			});
	}

	createUser(pSpec, fCallback)
	{
		return this._mutate('POST', 'Users', pSpec, 'createUser', fCallback);
	}

	getUser(pUserID, fCallback)
	{
		return this._call('GET', 'User/' + encodeURIComponent(pUserID), null)
			.then((pResp) =>
			{
				let tmpUser = (pResp && pResp.body && pResp.body.User) || null;
				if (tmpUser)
				{
					this._setSelectedUser(tmpUser);
				}
				if (fCallback) fCallback(null, tmpUser);
				return tmpUser;
			})
			.catch((pErr) =>
			{
				this._setError('getUser', pErr);
				if (fCallback) fCallback(pErr);
				throw pErr;
			});
	}

	updateUser(pUserID, pUpdates, fCallback)
	{
		return this._mutate('PUT', 'User/' + encodeURIComponent(pUserID),
			pUpdates, 'updateUser', fCallback);
	}

	deleteUser(pUserID, fCallback)
	{
		return this._mutate('DELETE', 'User/' + encodeURIComponent(pUserID),
			null, 'deleteUser', fCallback);
	}

	setUserPassword(pUserID, pNewPassword, fCallback)
	{
		return this._mutate('POST',
			'User/' + encodeURIComponent(pUserID) + '/SetPassword',
			{ NewPassword: pNewPassword }, 'setUserPassword', fCallback);
	}

	changePassword(pCurrentPassword, pNewPassword, fCallback)
	{
		return this._mutate('POST', 'Me/ChangePassword',
			{ CurrentPassword: pCurrentPassword, NewPassword: pNewPassword },
			'changePassword', fCallback);
	}

	// =========================================================
	// Convenience read accessors (mirror common UI guards)
	// =========================================================

	currentUser()
	{
		let tmpAD = this.pict && this.pict.AppData
			&& this.pict.AppData.UserManagement;
		return (tmpAD && tmpAD.CurrentUser) || { LoggedIn: false };
	}

	isLoggedIn()
	{
		return !!this.currentUser().LoggedIn;
	}

	isAdmin()
	{
		let tmpUser = this.currentUser();
		if (!tmpUser.LoggedIn) return false;
		let tmpRecord = tmpUser.UserRecord || tmpUser;
		let tmpRoles = tmpRecord.Roles;
		return Array.isArray(tmpRoles) && tmpRoles.indexOf(this._AdminRole) >= 0;
	}

	// =========================================================
	// Internals
	// =========================================================

	_call(pMethod, pPath, pBody)
	{
		if (!this._Fetcher)
		{
			return Promise.reject(new Error(
				'Pict-UserManagement-Provider: no Fetcher available; pass options.Fetcher or run in a fetch-capable environment'));
		}
		let tmpURL = this._BaseURL + pPath;
		let tmpOpts =
		{
			method: pMethod,
			credentials: 'same-origin',  // ensure session cookie rides along
			headers: { 'Accept': 'application/json' }
		};
		if (pBody !== undefined && pBody !== null)
		{
			tmpOpts.headers['Content-Type'] = 'application/json';
			tmpOpts.body = JSON.stringify(pBody);
		}
		return this._Fetcher(tmpURL, tmpOpts)
			.then((pResp) =>
			{
				// Accept both Response objects (fetch native) and a
				// duck-typed mock for tests (just needs ok/status/json()).
				let tmpStatus = (pResp && pResp.status) || 0;
				let tmpOk = (pResp && pResp.ok) !== false && tmpStatus < 400;
				return Promise.resolve(pResp.json ? pResp.json() : (pResp.body || {}))
					.then((pBody) =>
					{
						if (!tmpOk)
						{
							let tmpErr = new Error((pBody && (pBody.Reason || pBody.Error))
								|| ('HTTP ' + tmpStatus));
							tmpErr.status = tmpStatus;
							tmpErr.body = pBody;
							throw tmpErr;
						}
						return { status: tmpStatus, body: pBody };
					});
			});
	}

	_mutate(pMethod, pPath, pBody, pAction, fCallback)
	{
		this._setLoading('Mutating', true);
		return this._call(pMethod, pPath, pBody)
			.then((pResp) =>
			{
				this._setLoading('Mutating', false);
				this._setError(pAction, null);
				if (fCallback) fCallback(null, pResp && pResp.body);
				return pResp && pResp.body;
			})
			.catch((pErr) =>
			{
				this._setLoading('Mutating', false);
				this._setError(pAction, pErr);
				if (fCallback) fCallback(pErr);
				throw pErr;
			});
	}

	_setCurrentUser(pUser)
	{
		let tmpAD = this._appData();
		if (!tmpAD) return;
		tmpAD.CurrentUser = pUser || { LoggedIn: false };
		this._notify('CurrentUser', tmpAD.CurrentUser);
	}

	_setUsers(pUsers)
	{
		let tmpAD = this._appData();
		if (!tmpAD) return;
		tmpAD.AllUsers = Array.isArray(pUsers) ? pUsers : [];
		this._notify('AllUsers', tmpAD.AllUsers);
	}

	_setSelectedUser(pUser)
	{
		let tmpAD = this._appData();
		if (!tmpAD) return;
		tmpAD.SelectedUser = pUser || null;
		this._notify('SelectedUser', tmpAD.SelectedUser);
	}

	_setError(pAction, pErr)
	{
		let tmpAD = this._appData();
		if (!tmpAD) return;
		if (!pErr)
		{
			tmpAD.LastError = null;
		}
		else
		{
			tmpAD.LastError =
			{
				Action: pAction,
				Message: (pErr && pErr.message) || String(pErr),
				Status: (pErr && pErr.status) || 0,
				Reason: (pErr && pErr._reason) || (pErr && pErr.body && pErr.body.Reason) || ''
			};
		}
		this._notify('LastError', tmpAD.LastError);
	}

	_setLoading(pKey, pIsLoading)
	{
		let tmpAD = this._appData();
		if (!tmpAD) return;
		if (!tmpAD.Loading) tmpAD.Loading = {};
		tmpAD.Loading[pKey] = !!pIsLoading;
		this._notify('Loading', tmpAD.Loading);
	}

	_appData()
	{
		return (this.pict && this.pict.AppData && this.pict.AppData.UserManagement)
			|| null;
	}

	_notify(pKey, pValue)
	{
		// Best-effort store notification so views subscribed to the
		// store auto-rerender. Works with or without pict.store
		// (some hosts don't wire it).
		if (this.pict && this.pict.store && typeof this.pict.store.set === 'function')
		{
			try { this.pict.store.set('UserManagement.' + pKey, pValue); }
			catch (pErr) { /* ignore */ }
		}
	}
}

module.exports = PictUserManagementProvider;
module.exports.default_configuration = _DefaultConfiguration;
