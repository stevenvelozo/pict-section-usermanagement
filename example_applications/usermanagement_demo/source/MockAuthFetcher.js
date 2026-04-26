/**
 * MockAuthFetcher — fetch()-shaped function that runs an in-process
 * AuthProvider so the demo works with no backend running.
 *
 * Build a single instance per page, hand it to the
 * Pict-UserManagement-Provider via its `Fetcher` option, and the
 * full login + user-mgmt flow exercises against an in-memory user
 * store (Username/Password/Roles seeded below). Sessions live in
 * a single string variable inside this module — refreshing the
 * browser logs you out.
 *
 * Why ship a mock instead of pointing at a real auth-beacon?
 * =========================================================
 * The demo is an example_application — it should boot from a
 * static-file server, no Node backend needed. Pointing at a real
 * auth-beacon would mean running ultravisor + ultravisor-auth-beacon
 * + the lab's auth proxy, which is all useful infrastructure but a
 * lot to ask of someone reviewing how to use the Pict module. The
 * mock keeps the demo focused on the views and the provider's
 * client-side contract.
 *
 * Real-app integration looks just like this file with the
 * MemoryAuthProvider routing replaced by a `fetch(realURL, opts)`
 * — i.e., the default Fetcher already does the right thing in
 * production. This module ONLY exists for the demo.
 */

// MemoryAuthProvider's full server-side semantics live in the
// ultravisor-auth-beacon package (with bcrypt-style hooks, session
// sweeps, beacon-join validation, etc.). This file inlines a
// browser-friendly subset so the demo has zero install-time
// dependencies beyond pict + pict-section-usermanagement itself.
//
// The route shapes match the auth-beacon's HTTP surface byte-for-byte
// — same status codes, same response bodies — so swapping this mock
// for a real backend is just changing the Fetcher option.

const libCrypto = (typeof window !== 'undefined' && window.crypto)
	? window.crypto : null;

function _randomToken()
{
	if (libCrypto && libCrypto.getRandomValues)
	{
		let tmpBuf = new Uint8Array(24);
		libCrypto.getRandomValues(tmpBuf);
		return Array.prototype.map.call(tmpBuf,
			(n) => n.toString(16).padStart(2, '0')).join('');
	}
	// Last-resort: weaker but functional. Demo-only, so acceptable.
	return ('demo-' + Date.now().toString(16) + '-' + Math.random().toString(16).slice(2));
}

function _scrub(pUser)
{
	return {
		UserID: pUser.UserID, Username: pUser.Username,
		Roles: pUser.Roles.slice(),
		NameFirst: pUser.NameFirst || '', NameLast: pUser.NameLast || '',
		FullName: pUser.FullName || pUser.Username, Email: pUser.Email || ''
	};
}

class DemoUserStore
{
	constructor(pSeedUsers)
	{
		this._Users = new Map();
		this._Sessions = new Map();
		(pSeedUsers || []).forEach((u) => this.addUser(u));
	}
	addUser(pUser)
	{
		let tmpKey = String(pUser.Username).toLowerCase();
		this._Users.set(tmpKey,
		{
			UserID: pUser.UserID || tmpKey,
			Username: pUser.Username,
			Password: pUser.Password,
			Roles: Array.isArray(pUser.Roles) ? pUser.Roles.slice() : [],
			NameFirst: pUser.NameFirst || '', NameLast: pUser.NameLast || '',
			FullName: pUser.FullName || pUser.Username, Email: pUser.Email || ''
		});
	}
	authenticate(pU, pP)
	{
		let tmpUser = this._Users.get(String(pU || '').toLowerCase());
		if (!tmpUser || tmpUser.Password !== pP) return null;
		return _scrub(tmpUser);
	}
	createSession(pUser)
	{
		let tmpToken = _randomToken();
		this._Sessions.set(tmpToken, { User: pUser, ExpiresAt: Date.now() + 24 * 3600 * 1000 });
		return tmpToken;
	}
	getSession(pToken)
	{
		if (!pToken) return null;
		let tmpEntry = this._Sessions.get(pToken);
		if (!tmpEntry) return null;
		if (tmpEntry.ExpiresAt < Date.now()) { this._Sessions.delete(pToken); return null; }
		return tmpEntry.User;
	}
	revokeSession(pToken) { this._Sessions.delete(pToken); }
	listUsers() { return Array.from(this._Users.values()).map(_scrub); }
	getUserByID(pID) { return Array.from(this._Users.values()).find((u) => u.UserID === pID); }
	keyFor(pU) { return String(pU.Username || '').toLowerCase(); }
	createUser(pSpec)
	{
		if (!pSpec.Username) return { Success: false, Reason: 'Username is required' };
		if (!pSpec.Password) return { Success: false, Reason: 'Password is required' };
		let tmpKey = String(pSpec.Username).toLowerCase();
		if (this._Users.has(tmpKey)) return { Success: false, Reason: 'User already exists' };
		this.addUser(pSpec);
		return { Success: true, User: _scrub(this._Users.get(tmpKey)) };
	}
	updateUser(pID, pUpdates)
	{
		let tmpUser = this.getUserByID(pID);
		if (!tmpUser) return { Success: false, Reason: 'Unknown user' };
		let tmpOldKey = this.keyFor(tmpUser);
		if (pUpdates.Username && pUpdates.Username !== tmpUser.Username
			&& this._Users.has(String(pUpdates.Username).toLowerCase())
			&& String(pUpdates.Username).toLowerCase() !== tmpOldKey)
		{
			return { Success: false, Reason: 'Username already in use' };
		}
		['Username', 'FullName', 'NameFirst', 'NameLast', 'Email'].forEach((k) =>
		{
			if (pUpdates[k] != null) tmpUser[k] = pUpdates[k];
		});
		if (Array.isArray(pUpdates.Roles)) tmpUser.Roles = pUpdates.Roles.slice();
		let tmpNewKey = this.keyFor(tmpUser);
		if (tmpNewKey !== tmpOldKey)
		{
			this._Users.delete(tmpOldKey);
			this._Users.set(tmpNewKey, tmpUser);
		}
		return { Success: true, User: _scrub(tmpUser) };
	}
	deleteUser(pID)
	{
		let tmpUser = this.getUserByID(pID);
		if (!tmpUser) return { Success: false, Reason: 'Unknown user' };
		this._Users.delete(this.keyFor(tmpUser));
		// Revoke their sessions
		for (let [tmpToken, tmpEntry] of this._Sessions.entries())
		{
			if (tmpEntry.User.UserID === pID) this._Sessions.delete(tmpToken);
		}
		return { Success: true };
	}
	setPassword(pID, pNew)
	{
		let tmpUser = this.getUserByID(pID);
		if (!tmpUser) return { Success: false, Reason: 'Unknown user' };
		if (!pNew) return { Success: false, Reason: 'New password is required' };
		tmpUser.Password = pNew;
		return { Success: true };
	}
	changePassword(pID, pCurrent, pNew)
	{
		let tmpUser = this.getUserByID(pID);
		if (!tmpUser) return { Success: false, Reason: 'Unknown user' };
		if (tmpUser.Password !== pCurrent) return { Success: false, Reason: 'Current password incorrect' };
		if (!pNew) return { Success: false, Reason: 'New password is required' };
		tmpUser.Password = pNew;
		// Revoke other sessions (matches MemoryAuthProvider behavior)
		for (let [tmpToken, tmpEntry] of this._Sessions.entries())
		{
			if (tmpEntry.User.UserID === pID) this._Sessions.delete(tmpToken);
		}
		return { Success: true };
	}
}

/**
 * Build a Fetcher function that the Pict-UserManagement-Provider can
 * call. The "session cookie" is just a closed-over string — there's
 * no real cookie jar — but the rest of the contract is identical
 * to what a real backend would produce.
 */
function createMockFetcher(pSeedUsers)
{
	let tmpStore = new DemoUserStore(pSeedUsers || []);
	let _SessionToken = '';

	function _routes(pMethod, pPath, pBody)
	{
		// Strip query for matching
		let tmpQ = pPath.indexOf('?');
		let tmpPathOnly = (tmpQ >= 0) ? pPath.slice(0, tmpQ) : pPath;
		let tmpQuery = (tmpQ >= 0) ? pPath.slice(tmpQ + 1) : '';

		// CheckSession
		if (pMethod === 'GET' && tmpPathOnly === 'CheckSession')
		{
			let tmpUser = tmpStore.getSession(_SessionToken);
			if (!tmpUser) return { status: 200, body: { LoggedIn: false } };
			return {
				status: 200,
				body:
				{
					LoggedIn: true,
					SessionID: _SessionToken,
					UserID: tmpUser.UserID,
					UserRecord:
					{
						LoginID: tmpUser.Username,
						IDUser: tmpUser.UserID,
						Roles: tmpUser.Roles.slice(),
						FullName: tmpUser.FullName,
						Email: tmpUser.Email
					}
				}
			};
		}
		// Authenticate
		if (pMethod === 'POST' && tmpPathOnly === 'Authenticate')
		{
			let tmpUser = tmpStore.authenticate(pBody && pBody.UserName, pBody && pBody.Password);
			if (!tmpUser) return { status: 200, body: { LoggedIn: false, Error: 'Authentication failed.' } };
			_SessionToken = tmpStore.createSession(tmpUser);
			return {
				status: 200,
				body:
				{
					LoggedIn: true,
					SessionID: _SessionToken,
					UserID: tmpUser.UserID,
					UserRecord:
					{
						LoginID: tmpUser.Username,
						IDUser: tmpUser.UserID,
						Roles: tmpUser.Roles.slice(),
						FullName: tmpUser.FullName,
						Email: tmpUser.Email
					}
				}
			};
		}
		// Deauthenticate
		if (pMethod === 'POST' && tmpPathOnly === 'Deauthenticate')
		{
			tmpStore.revokeSession(_SessionToken);
			_SessionToken = '';
			return { status: 200, body: { LoggedIn: false } };
		}
		// Below: every route requires a session; admin routes require
		// the admin role. Mirror the auth-beacon server-routes helper.
		let tmpCurrent = tmpStore.getSession(_SessionToken);
		if (!tmpCurrent)
		{
			return { status: 401, body: { Error: 'Authentication required.', LoggedIn: false } };
		}
		let tmpIsAdmin = Array.isArray(tmpCurrent.Roles) && tmpCurrent.Roles.indexOf('admin') >= 0;
		// Users (list / create)
		if (tmpPathOnly === 'Users')
		{
			if (!tmpIsAdmin) return { status: 403, body: { Error: 'Admin role required.' } };
			if (pMethod === 'GET')
			{
				let tmpAll = tmpStore.listUsers();
				let tmpSearch = '';
				if (tmpQuery)
				{
					let tmpMatch = tmpQuery.match(/(?:^|&)search=([^&]*)/);
					if (tmpMatch) tmpSearch = decodeURIComponent(tmpMatch[1]).toLowerCase();
				}
				if (tmpSearch)
				{
					tmpAll = tmpAll.filter((u) =>
						(u.Username || '').toLowerCase().indexOf(tmpSearch) >= 0);
				}
				return { status: 200, body: { Success: true, Users: tmpAll } };
			}
			if (pMethod === 'POST')
			{
				let tmpRes = tmpStore.createUser(pBody || {});
				return { status: tmpRes.Success ? 201 : 400, body: tmpRes };
			}
		}
		// User/:UserID (get / put / del) and User/:UserID/SetPassword
		let tmpUserMatch = tmpPathOnly.match(/^User\/([^\/]+)(?:\/(SetPassword))?$/);
		if (tmpUserMatch)
		{
			if (!tmpIsAdmin) return { status: 403, body: { Error: 'Admin role required.' } };
			let tmpID = decodeURIComponent(tmpUserMatch[1]);
			let tmpAction = tmpUserMatch[2] || '';
			if (tmpAction === 'SetPassword' && pMethod === 'POST')
			{
				let tmpRes = tmpStore.setPassword(tmpID, pBody && pBody.NewPassword);
				return { status: tmpRes.Success ? 200 : (/Unknown user/.test(tmpRes.Reason || '') ? 404 : 400), body: tmpRes };
			}
			if (!tmpAction)
			{
				if (pMethod === 'GET')
				{
					let tmpUser = tmpStore.getUserByID(tmpID);
					if (!tmpUser) return { status: 404, body: { Success: false, Reason: 'Unknown user' } };
					return { status: 200, body: { Success: true, User: _scrub(tmpUser) } };
				}
				if (pMethod === 'PUT')
				{
					let tmpRes = tmpStore.updateUser(tmpID, pBody || {});
					return { status: tmpRes.Success ? 200 : (/Unknown user/.test(tmpRes.Reason || '') ? 404 : 400), body: tmpRes };
				}
				if (pMethod === 'DELETE')
				{
					if (tmpCurrent.UserID === tmpID)
					{
						return { status: 409, body: { Success: false, Reason: 'Cannot delete the currently logged-in user' } };
					}
					let tmpRes = tmpStore.deleteUser(tmpID);
					return { status: tmpRes.Success ? 200 : 404, body: tmpRes };
				}
			}
		}
		// Me/ChangePassword
		if (pMethod === 'POST' && tmpPathOnly === 'Me/ChangePassword')
		{
			let tmpRes = tmpStore.changePassword(tmpCurrent.UserID,
				pBody && pBody.CurrentPassword, pBody && pBody.NewPassword);
			return { status: tmpRes.Success ? 200 : 400, body: tmpRes };
		}
		return { status: 404, body: { Error: 'Mock backend: unmatched route ' + pMethod + ' ' + pPath } };
	}

	return function mockFetch(pURL, pOpts)
	{
		// Strip everything up to and including '/1.0/' so the route
		// matcher only sees the rest of the path.
		let tmpURL = String(pURL || '');
		let tmpPrefix = tmpURL.indexOf('/1.0/');
		let tmpPath = (tmpPrefix >= 0) ? tmpURL.slice(tmpPrefix + 5) : tmpURL;
		let tmpMethod = ((pOpts && pOpts.method) || 'GET').toUpperCase();
		let tmpBody = null;
		if (pOpts && pOpts.body)
		{
			try { tmpBody = JSON.parse(pOpts.body); }
			catch (pErr) { tmpBody = null; }
		}
		// Simulate a small network delay so the loading states are
		// briefly visible — instructive for someone reviewing the demo.
		return new Promise((fResolve) =>
		{
			setTimeout(() =>
			{
				let tmpResp = _routes(tmpMethod, tmpPath, tmpBody);
				fResolve(
				{
					ok: tmpResp.status < 400,
					status: tmpResp.status,
					json: () => Promise.resolve(tmpResp.body)
				});
			}, 80);
		});
	};
}

module.exports = createMockFetcher;
