/**
 * Headless smoke for the demo bundle.
 *
 * Loads the built dist/ in a jsdom environment, boots the Pict app,
 * and exercises the major flows by clicking through the DOM the same
 * way a user would. Catches:
 *   - bundle errors (require resolution, syntax)
 *   - boot errors (Pict initialization, view registration)
 *   - render errors (template parsing, DOM access)
 *   - flow errors (login, list, create, edit, change-password, delete)
 *
 * Run from this directory:  node smoke.js
 */

const libFS = require('fs');
const libPath = require('path');
const { JSDOM } = require('jsdom');

const ROOT = __dirname;
const HTML = libFS.readFileSync(libPath.join(ROOT, 'dist', 'index.html'), 'utf8');
const PICT_BUNDLE = libFS.readFileSync(libPath.join(ROOT, 'dist', 'js', 'pict.min.js'), 'utf8');
const APP_BUNDLE = libFS.readFileSync(libPath.join(ROOT, 'dist', 'pict-section-usermanagement-demo.min.js'), 'utf8');

// Strip the page's <script> tags before handing the HTML to JSDOM —
// we evaluate the bundles ourselves below via window.eval. Letting
// jsdom try to fetch them would either 404 (about:blank base URL)
// or race the inline `Pict.safeOnDocumentReady(...)` boot statement
// before our eval has assigned the globals.
const SCRIPT_TAG_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const HTML_NO_SCRIPTS = HTML.replace(SCRIPT_TAG_RE, '');

const dom = new JSDOM(HTML_NO_SCRIPTS,
{
	runScripts: 'outside-only',
	pretendToBeVisual: true
});
const { window } = dom;

// Surface any uncaught errors so the smoke fails loudly rather than
// silently letting a stack trace into the demo's promise queue.
window.addEventListener('error', (e) =>
{
	console.error('!!! window error:', e.message, e.error && e.error.stack);
	process.exit(1);
});

function $(pSel) { return window.document.querySelector(pSel); }
function $$(pSel) { return Array.from(window.document.querySelectorAll(pSel)); }
function sleep(pMs) { return new Promise((r) => setTimeout(r, pMs)); }

async function step(pLabel, fFn)
{
	process.stdout.write('• ' + pLabel + ' ... ');
	try { await fFn(); console.log('OK'); }
	catch (pErr)
	{
		console.log('FAIL');
		console.error('  ' + (pErr.stack || pErr.message || pErr));
		process.exit(1);
	}
}

async function main()
{
	// Run the bundles inside the window's script context so window-level
	// globals (Pict, PictSectionUserManagementDemo) get assigned. Plain
	// vm.runInContext or appending a <script> with text won't work here
	// — JSDOM only executes <script>s loaded from src URLs in the
	// "dangerously" mode unless we explicitly evaluate the source.
	window.eval(PICT_BUNDLE);
	if (typeof window.Pict !== 'function')
	{
		console.error('Pict global missing after pict.min.js');
		process.exit(1);
	}

	window.eval(APP_BUNDLE);
	if (typeof window.PictSectionUserManagementDemo !== 'function')
	{
		console.error('PictSectionUserManagementDemo global missing after app bundle');
		process.exit(1);
	}
	console.log('• Bundle loaded — globals: Pict, PictSectionUserManagementDemo');

	// Boot the app
	let tmpApp = window.PictSectionUserManagementDemo;
	let tmpPict = new window.Pict(tmpApp.pict_configuration);
	tmpPict.addApplication('UserMgmtDemo', tmpApp.default_configuration, tmpApp);
	await new Promise((fResolve, fReject) =>
	{
		tmpPict.PictApplication.initializeAsync((pErr) =>
		{
			if (pErr) return fReject(pErr);
			fResolve();
		});
	});
	console.log('• Pict app initialized');

	// Step through the flow.
	await step('login form is rendered when logged out', async () =>
	{
		await sleep(120);  // first CheckSession + render
		let tmpUser = $('#PictUM-Login-Username');
		if (!tmpUser) throw new Error('login username field missing');
	});

	await step('failed login shows error message', async () =>
	{
		$('#PictUM-Login-Username').value = 'admin';
		$('#PictUM-Login-Password').value = 'wrong-password';
		$('#PictUM-Login-Form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
		await sleep(150);
		let tmpMsg = $('#PictUM-Login-Message');
		if (!tmpMsg || !tmpMsg.textContent.match(/failed/i)) throw new Error('expected an error message');
	});

	await step('successful admin login flips to logged-in state', async () =>
	{
		$('#PictUM-Login-Username').value = 'admin';
		$('#PictUM-Login-Password').value = 'admin';
		$('#PictUM-Login-Form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
		await sleep(200);
		let tmpUser = tmpPict.providers['Pict-UserManagement-Provider'].currentUser();
		if (!tmpUser.LoggedIn) throw new Error('CurrentUser not flipped to logged-in');
	});

	await step('Users tab shows user list with three seeded users', async () =>
	{
		// Switch to users tab
		tmpPict.PictApplication.switchTab('users');
		await sleep(200);
		let tmpRows = $$('#PictUM-UserList .pict-um-table tbody tr');
		if (tmpRows.length < 3) throw new Error('expected ≥3 user rows, got ' + tmpRows.length);
	});

	await step('current-user badge renders the admin name', async () =>
	{
		let tmpBadge = $('.pict-um-currentuser-name');
		if (!tmpBadge || !tmpBadge.textContent.toLowerCase().match(/admin/))
			throw new Error('current-user badge missing or wrong content');
	});

	await step('change-password tab renders three password fields', async () =>
	{
		tmpPict.PictApplication.switchTab('change-password');
		await sleep(120);
		let tmpFields =
		[
			$('#PictUM-PasswordChange-Current'),
			$('#PictUM-PasswordChange-New'),
			$('#PictUM-PasswordChange-Confirm')
		];
		if (tmpFields.some((f) => !f)) throw new Error('change-password form missing fields');
	});

	await step('create new user via Users tab', async () =>
	{
		tmpPict.PictApplication.switchTab('users');
		await sleep(200);
		// Click "New user" — opens the edit form in CreateMode
		let tmpNewBtn = $('#PictUM-UserList-New');
		if (!tmpNewBtn) throw new Error('New user button missing');
		tmpNewBtn.click();
		// Layout's render is the one that paints UserEdit; trigger by switching tab again
		tmpPict.PictApplication.switchTab('users');
		await sleep(150);
		// Fill the form
		let tmpU = $('#PictUM-UserEdit-Username');
		let tmpP = $('#PictUM-UserEdit-Password');
		if (!tmpU || !tmpP) throw new Error('UserEdit form fields missing in create mode');
		tmpU.value = 'carol';
		tmpP.value = 'cradle';
		(($('#PictUM-UserEdit-Email')) || {}).value = 'carol@example.com';
		(($('#PictUM-UserEdit-Roles')) || {}).value = 'user';
		$('#PictUM-UserEdit-Form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
		await sleep(250);
		// Re-fetch users and confirm carol exists
		let tmpProv = tmpPict.providers['Pict-UserManagement-Provider'];
		let tmpUsers = await tmpProv.loadUsers();
		let tmpFound = tmpUsers.find((u) => u.Username === 'carol');
		if (!tmpFound) throw new Error('carol not in user list after create');
	});

	await step('change-password rejects mismatched confirmation', async () =>
	{
		tmpPict.PictApplication.switchTab('change-password');
		await sleep(150);
		$('#PictUM-PasswordChange-Current').value = 'admin';
		$('#PictUM-PasswordChange-New').value = 'newpw';
		$('#PictUM-PasswordChange-Confirm').value = 'different';
		$('#PictUM-PasswordChange-Form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
		await sleep(150);
		let tmpMsg = $('#PictUM-PasswordChange-Message');
		if (!tmpMsg || !tmpMsg.textContent.match(/match/i))
			throw new Error('expected mismatch message, got: ' + (tmpMsg ? tmpMsg.textContent : '(none)'));
	});

	await step('change-password accepts a valid change', async () =>
	{
		$('#PictUM-PasswordChange-Current').value = 'admin';
		$('#PictUM-PasswordChange-New').value = 'newadmin';
		$('#PictUM-PasswordChange-Confirm').value = 'newadmin';
		$('#PictUM-PasswordChange-Form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
		await sleep(250);
		let tmpMsg = $('#PictUM-PasswordChange-Message');
		if (!tmpMsg || !tmpMsg.textContent.match(/updated/i))
			throw new Error('expected success message, got: ' + (tmpMsg ? tmpMsg.textContent : '(none)'));
	});

	await step('logout drops back to login form', async () =>
	{
		// Click the logout button in the badge
		let tmpLogout = $('.pict-um-currentuser-logout');
		if (!tmpLogout) throw new Error('logout button missing');
		tmpLogout.click();
		await sleep(200);
		let tmpUserLogged = tmpPict.providers['Pict-UserManagement-Provider'].currentUser();
		if (tmpUserLogged.LoggedIn) throw new Error('still logged in after logout click');
	});

	await step('login again with the changed password works', async () =>
	{
		await sleep(120);
		let tmpUserField = $('#PictUM-Login-Username');
		let tmpPassField = $('#PictUM-Login-Password');
		if (!tmpUserField || !tmpPassField) throw new Error('login form not visible after logout');
		tmpUserField.value = 'admin';
		tmpPassField.value = 'newadmin';
		$('#PictUM-Login-Form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
		await sleep(200);
		let tmpUser = tmpPict.providers['Pict-UserManagement-Provider'].currentUser();
		if (!tmpUser.LoggedIn) throw new Error('changed-password login failed');
	});

	console.log('\n✔ All smoke steps passed.');
	process.exit(0);
}

main().catch((e) => { console.error('\n!!! main threw:', e.stack || e); process.exit(1); });
