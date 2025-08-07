(function (factory) {
	typeof define === 'function' && define.amd ? define(factory) :
	factory();
})((function () { 'use strict';

	const EMULATOR_ACTIONS = {
		HEADSET_POSE_CHANGE: 'ea-headset-pose-change',
		CONTROLLER_POSE_CHANGE: 'ea-controller-pose-change',
		BUTTON_STATE_CHANGE: 'ea-button-state-change',
		ANALOG_VALUE_CHANGE: 'ea-analog-value-change',
		DEVICE_TYPE_CHANGE: 'ea-device-type-change',
		STEREO_TOGGLE: 'ea-stereo-toggle',
		KEYBOARD_EVENT: 'ea-keyboard-event',
		EXIT_IMMERSIVE: 'ea-exit-immersive',
		ROOM_DIMENSION_CHANGE: 'ea-room-dimension-change',
		EXCLUDE_POLYFILL: 'ea-exclude-polyfill',
		INPUT_MODE_CHANGE: 'ea-input-mode-change',
		HAND_POSE_CHANGE: 'ea-hand-pose-change',
		PINCH_VALUE_CHANGE: 'ea-pinch-value-change',
	};

	const DEVICE = {
		HEADSET: '0',
		RIGHT_CONTROLLER: '2',
		LEFT_CONTROLLER: '3',
	};
	const DEFAULT_TRANSFORMS = {};
	DEFAULT_TRANSFORMS[DEVICE.HEADSET] = {
		position: [0, 1.7, 0],
		rotation: [0, 0, 0, 'XYZ'],
	};
	DEFAULT_TRANSFORMS[DEVICE.RIGHT_CONTROLLER] = {
		position: [0.25, 1.5, -0.4],
		rotation: [0, 0, 0, 'XYZ'],
	};
	DEFAULT_TRANSFORMS[DEVICE.LEFT_CONTROLLER] = {
		position: [-0.25, 1.5, -0.4],
		rotation: [0, 0, 0, 'XYZ'],
	};

	const localStorage = chrome.storage.local;
	const STORAGE_KEY = 'immersive-web-emulator-settings';
	class EmulatorSettings {
		static get instance() {
			if (!EmulatorSettings._instance) {
				EmulatorSettings._instance = new EmulatorSettings();
			}
			return EmulatorSettings._instance;
		}
		constructor() {
			this.stereoOn = false;
			this.actionMappingOn = true;
			this.defaultPose = DEFAULT_TRANSFORMS;
			this.deviceKey = 'Meta Quest Pro';
			this.keyboardMappingOn = true;
			this.roomDimension = { x: 6, y: 3, z: 6 };
			this.polyfillExcludes = new Set();
			this.inputMode = 'controllers';
			this.handPoses = {
				'left-hand': 'relaxed',
				'right-hand': 'relaxed',
			};
		}
		load() {
			return new Promise((resolve) => {
				localStorage.get(STORAGE_KEY, (result) => {
					const settings = result[STORAGE_KEY]
						? JSON.parse(result[STORAGE_KEY])
						: null;
					this.stereoOn = settings?.stereoOn ?? false;
					this.actionMappingOn = settings?.actionMappingOn ?? true;
					this.defaultPose = settings?.defaultPose ?? DEFAULT_TRANSFORMS;
					this.deviceKey = settings?.deviceKey ?? 'Meta Quest Pro';
					this.keyboardMappingOn = settings?.keyboardMappingOn ?? true;
					this.roomDimension = settings?.roomDimension ?? { x: 6, y: 3, z: 6 };
					this.polyfillExcludes = new Set(settings?.polyfillExcludes ?? []);
					this.inputMode = settings?.inputMode ?? 'controllers';
					this.handPoses = settings?.handPoses ?? this.handPoses;
					resolve(result);
				});
			});
		}
		write() {
			const settings = {};
			settings[STORAGE_KEY] = JSON.stringify({
				stereoOn: this.stereoOn,
				actionMappingOn: this.actionMappingOn,
				defaultPose: this.defaultPose,
				deviceKey: this.deviceKey,
				keyboardMappingOn: this.keyboardMappingOn,
				roomDimension: this.roomDimension,
				polyfillExcludes: Array.from(this.polyfillExcludes),
				inputMode: this.inputMode,
				handPoses: this.handPoses,
			});
			return new Promise((resolve) => {
				localStorage.set(settings, () => {
					resolve(settings);
				});
			});
		}
	}

	const PORT_DESTINATION_MAPPING = {
		iwe_app: 'iwe_devtool',
		iwe_devtool: 'iwe_app',
	};
	const connectedTabs = {};
	const injectionId = 'iwe-polyfill-injection';
	const updateInjection = (reloadTabId = null) => {
		EmulatorSettings.instance.load().then(() => {
			chrome.scripting.getRegisteredContentScripts(
				{ ids: [injectionId] },
				(scripts) => {
					if (scripts.length == 0) {
						chrome.scripting.registerContentScripts([
							{
								id: injectionId,
								matches: ['http://*/*', 'https://*/*'],
								js: ['dist/webxr-polyfill.js'],
								allFrames: true,
								runAt: 'document_start',
								world: 'MAIN',
								excludeMatches: Array.from(
									EmulatorSettings.instance.polyfillExcludes,
								),
							},
						]);
					} else {
						scripts.forEach((script) => {
							script.excludeMatches = Array.from(
								EmulatorSettings.instance.polyfillExcludes,
							);
						});
						chrome.scripting.updateContentScripts(scripts, () => {
							if (reloadTabId) {
								chrome.tabs.reload(reloadTabId);
							}
						});
					}
				},
			);
		});
	};
	const relayMessage = (tabId, port, message) => {
		const destinationPorts =
			connectedTabs[tabId][PORT_DESTINATION_MAPPING[port.name]];
		destinationPorts.forEach((destinationPort) => {
			destinationPort.postMessage(message);
		});
	};
	chrome.runtime.onConnect.addListener((port) => {
		if (Object.keys(PORT_DESTINATION_MAPPING).includes(port.name)) {
			port.onMessage.addListener((message, sender) => {
				const tabId = message.tabId ?? sender.sender.tab.id;
				if (message.action === EMULATOR_ACTIONS.EXCLUDE_POLYFILL) {
					updateInjection(tabId);
				}
				if (!connectedTabs[tabId]) {
					connectedTabs[tabId] = {};
					Object.keys(PORT_DESTINATION_MAPPING).forEach((portName) => {
						connectedTabs[tabId][portName] = new Set();
					});
				}
				if (!connectedTabs[tabId][port.name].has(port)) {
					connectedTabs[tabId][port.name].add(port);
					port.onDisconnect.addListener(() => {
						connectedTabs[tabId][port.name].delete(port);
					});
				}
				relayMessage(tabId, port, message);
			});
		}
	});
	updateInjection();

}));
