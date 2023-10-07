// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from 'alt1';
import * as ChatReader from 'alt1/chatbox';
import * as MobReader from 'alt1/targetmob';
import { keys } from 'lodash';

// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
import './index.html';
import './appconfig.json';
import './icon.png';
import './css/whatsinyourpocket.css';

function getByID(id: string) {
	return document.getElementById(id);
}

let helperItems = {
	Output: getByID('output'),
	settings: getByID('Settings')
}

let chatReader = new ChatReader.default();
chatReader.readargs = {
	colors: [
		a1lib.mixColor(255, 204, 0),
	],
};

let getChat = () => {
	if (chatReader) {
		console.log(chatReader);
		if (!chatReader.pos) {
			chatReader.find();
		}
	}
}

let mobReader = new MobReader.default();

let getMob = () => {
	if (mobReader) {
		mobReader.read();
		if(mobReader.state === null) {
			updateSetting('inCombat', false);
			window.setTimeout(getMob, 300);
		} else {
			updateSetting('inCombat', true);
		}
	}
}

const POCKET_TEXT = {
	'Your god book is now active': 'god book',
	'Your grimoire is now active': 'grim',
	'Your scrimshaw is now active': 'scrimshaw',
	'Your god book is no longer active': 'god book inactive',
	'Your grimoire is no longer active': 'grim inactive',
	'Your scrimshaw is no longer active': 'scrimshaw inactive',
};

export function startWiyp() {
	if (!window.alt1) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div>You need to run this page in alt1 to capture the screen</div>`
		);
		return;
	}
	if (!alt1.permissionPixel) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Page is not installed as app or capture permission is not enabled</p></div>`
		);
		return;
	}
	if (!alt1.permissionOverlay) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Attempted to use Overlay but app overlay permission is not enabled. Please enable "Show Overlay" permission in Alt1 settinsg (wrench icon in corner).</p></div>`
		);
		return;
	}
	setInterval(readChatbox, 200);
	setInterval(getChat, 100);
	setInterval(getMob, 100);
}

async function readChatbox() {
	if (chatReader && chatReader.pos && chatReader.pos.boxes[0] !== undefined) {
		let chatLines = chatReader.read();
		let pocketMessages = keys(POCKET_TEXT);
		chatLines?.forEach((line) => {
			let match = pocketMessages.find((message) => line.text.includes(message));
			if (match?.indexOf('god') > -1) {
				updateSetting('pocketItem', 'god book');
				console.log('Equipped pocket slot is god book');
			}
			if (match?.indexOf('grimoire') > -1) {
				updateSetting('pocketItem', 'grimoire');
				console.log('Equipped pocket slot is grimoire');
			}
			if (match?.indexOf('scrimshaw') > -1) {
				updateSetting('pocketItem', 'scrimshaw');
				console.log('Equipped pocket slot is scrimshaw');
			}
			if (match?.indexOf('now') > -1) {
				updateSetting('pocketState', true);
				console.log('Equipped pocket slot is active');
			}
			if (match?.indexOf('longer') > -1) {
				updateSetting('pocketState', false);
				console.log('Equipped pocket slot is no longer active');
			}
		});
	}
	updateOverlay();
}

function updateLocation(e) {
	updateSetting('overlayPosition', {
		x: Math.floor(
			e.x
		),
		y: Math.floor(
			e.y
		),
	});
	updateSetting('updatingOverlayPosition', false);
	alt1.overLayClearGroup('overlayPositionHelper');
}

async function updateOverlay() {
	let overlayPosition = getSetting('overlayPosition');
	let pocketItem = getSetting('pocketItem');
	let pocketState = getSetting('pocketState');
	let inCombat = getSetting('inCombat');
	alt1.overLaySetGroup('wiyp');
	alt1.overLayFreezeGroup('wiyp');

	alt1.overLayClearGroup('wiyp');

	if (getSetting('pocketItem') == '') {
		alt1.overLayText(
			`Toggle pocket item on/off to begin tracking...`,
			a1lib.mixColor(255, 255, 255),
			24,
			overlayPosition.x,
			overlayPosition.y,
			125
		);
	} else if ((pocketState && !inCombat) || !pocketState && inCombat) {
		alt1.overLayText(
			`${pocketItem ? pocketItem : '???'} is ${
				pocketState ? 'active' : 'inactive'
			} ${inCombat ? 'while in combat' : 'while out of combat'}`,
			a1lib.mixColor(255, 0, 0),
			24,
			overlayPosition.x,
			overlayPosition.y,
			300
		);
	}
	alt1.overLayRefreshGroup('wiyp');
	await new Promise((done) => setTimeout(done, 300));
}

function initSettings() {
	if (!localStorage.wiyp) {
		setDefaultSettings();
	}
	setEmptyPocket();
}

function setDefaultSettings() {
	localStorage.setItem(
		'wiyp',
		JSON.stringify({
			inCombat: false,
			overlayPosition: { x: 100, y: 100 },
			pocketItem: '',
			pocketState: false,
			updatingOverlayPosition: false,
		})
	);
}

function setEmptyPocket() {
	updateSetting('pocketItem', '');
}

let posBtn = getByID('OverlayPosition');
posBtn.addEventListener('click', setOverlayPosition);
async function setOverlayPosition() {
	a1lib.once('alt1pressed', updateLocation);
	updateSetting('updatingOverlayPosition', true);
	while (getSetting('updatingOverlayPosition')) {
		alt1.setTooltip('Press Alt+1 to set overlay position.');
		alt1.overLaySetGroup('overlayPositionHelper');
		alt1.overLayRect(
			a1lib.mixColor(255, 255, 255),
			Math.floor(
				a1lib.getMousePosition().x
			),
			Math.floor(
				a1lib.getMousePosition().y
			),
			300,
			50,
			200,
			2
		);
		await new Promise((done) => setTimeout(done, 200));
	}
	alt1.clearTooltip();
}

function getSetting(setting) {
	if (!localStorage.wiyp) {
		initSettings();
	}
	return JSON.parse(localStorage.getItem('wiyp'))[setting];
}

function updateSetting(setting, value) {
	if (!localStorage.getItem('wiyp')) {
		localStorage.setItem('wiyp', JSON.stringify({}));
	}
	var save_data = JSON.parse(localStorage.getItem('wiyp'));
	save_data[setting] = value;
	localStorage.setItem('wiyp', JSON.stringify(save_data));
}

let resetAllSettingsButton = getByID('ResetAllSettings');
resetAllSettingsButton.addEventListener('click', () => {
	localStorage.removeItem('wiyp');
	localStorage.clear();
	initSettings();
	location.reload();
});


window.onload = function () {
	//check if we are running inside alt1 by checking if the alt1 global exists
	if (window.alt1) {
		//tell alt1 about the app
		//this makes alt1 show the add app button when running inside the embedded browser
		//also updates app settings if they are changed
		alt1.identifyAppUrl('./appconfig.json');
		initSettings();
		getChat();
		startWiyp();
	} else {
		let addappurl = `alt1://addapp/${
			new URL('./appconfig.json', document.location.href).href
		}`;
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`
			Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1
		`
		);
	}
};
