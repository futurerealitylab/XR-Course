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
	const POLYFILL_ACTIONS = {
		HEADSET_POSE_CHANGE: 'pa-headset-pose-change',
		CONTROLLER_POSE_CHANGE: 'pa-controller-pose-change',
		BUTTON_STATE_CHANGE: 'pa-button-state-change',
		ANALOG_VALUE_CHANGE: 'pa-analog-value-change',
		DEVICE_TYPE_CHANGE: 'pa-device-type-change',
		STEREO_TOGGLE: 'pa-stereo-toggle',
		KEYBOARD_EVENT: 'pa-keyboard-event',
		EXIT_IMMERSIVE: 'pa-exit-immersive',
		DEVICE_INIT: 'pa-device-init',
		ROOM_DIMENSION_CHANGE: 'pa-room-dimension-change',
		INPUT_MODE_CHANGE: 'pa-input-mode-change',
		HAND_POSE_CHANGE: 'pa-hand-pose-change',
		PINCH_VALUE_CHANGE: 'pa-pinch-value-change',
	};
	const CLIENT_ACTIONS = {
		ENTER_IMMERSIVE: 'ca-enter-immersive',
		EXIT_IMMERSIVE: 'ca-exit-immersive',
	};

	const DEVICE_DEFINITIONS = {
		'Oculus Rift CV1': {
			id: 'Oculus Rift CV1',
			name: 'Oculus Rift CV1',
			profile: 'oculus-touch',
			modes: ['inline', 'immersive-vr'],
			headset: {
				hasPosition: true,
				hasRotation: true,
			},
			controllers: [
				{
					id: 'Oculus Touch (Left)',
					buttonNum: 7,
					primaryButtonIndex: 1,
					primarySqueezeButtonIndex: 2,
					hasPosition: true,
					hasRotation: true,
					hasSqueezeButton: true,
					handedness: 'left',
				},
				{
					id: 'Oculus Touch (Right)',
					buttonNum: 7,
					primaryButtonIndex: 1,
					primarySqueezeButtonIndex: 2,
					hasPosition: true,
					hasRotation: true,
					hasSqueezeButton: true,
					handedness: 'right',
				},
			],
			polyfillInputMapping: {
				axes: [2, 3, 0, 1],
				buttons: [1, 2, null, 0, 3, 4, null],
			},
		},
		'Oculus Rift S': {
			id: 'Oculus Rift S',
			name: 'Oculus Rift S',
			profile: 'oculus-touch-v2',
			modes: ['inline', 'immersive-vr'],
			headset: {
				hasPosition: true,
				hasRotation: true,
			},
			controllers: [
				{
					id: 'Oculus Touch V2 (Left)',
					buttonNum: 7,
					primaryButtonIndex: 1,
					primarySqueezeButtonIndex: 2,
					hasPosition: true,
					hasRotation: true,
					hasSqueezeButton: true,
					handedness: 'left',
				},
				{
					id: 'Oculus Touch V2 (Right)',
					buttonNum: 7,
					primaryButtonIndex: 1,
					primarySqueezeButtonIndex: 2,
					hasPosition: true,
					hasRotation: true,
					hasSqueezeButton: true,
					handedness: 'right',
				},
			],
			polyfillInputMapping: {
				axes: [2, 3, 0, 1],
				buttons: [1, 2, null, 0, 3, 4, null],
			},
		},
		'Oculus Quest': {
			id: 'Oculus Quest',
			name: 'Oculus Quest',
			profile: 'oculus-touch-v2',
			modes: ['inline', 'immersive-vr'],
			headset: {
				hasPosition: true,
				hasRotation: true,
			},
			controllers: [
				{
					id: 'Oculus Touch V2 (Left)',
					buttonNum: 7,
					primaryButtonIndex: 1,
					primarySqueezeButtonIndex: 2,
					hasPosition: true,
					hasRotation: true,
					hasSqueezeButton: true,
					handedness: 'left',
				},
				{
					id: 'Oculus Touch V2 (Right)',
					buttonNum: 7,
					primaryButtonIndex: 1,
					primarySqueezeButtonIndex: 2,
					hasPosition: true,
					hasRotation: true,
					hasSqueezeButton: true,
					handedness: 'right',
				},
			],
			polyfillInputMapping: {
				axes: [2, 3, 0, 1],
				buttons: [1, 2, null, 0, 3, 4, null],
			},
		},
		'Oculus Quest 2': {
			id: 'Oculus Quest 2',
			name: 'Oculus Quest 2',
			profile: 'oculus-touch-v3',
			modes: ['inline', 'immersive-vr', 'immersive-ar'],
			headset: {
				hasPosition: true,
				hasRotation: true,
			},
			controllers: [
				{
					id: 'Oculus Touch V3 (Left)',
					buttonNum: 7,
					primaryButtonIndex: 1,
					primarySqueezeButtonIndex: 2,
					hasPosition: true,
					hasRotation: true,
					hasSqueezeButton: true,
					handedness: 'left',
				},
				{
					id: 'Oculus Touch V3 (Right)',
					buttonNum: 7,
					primaryButtonIndex: 1,
					primarySqueezeButtonIndex: 2,
					hasPosition: true,
					hasRotation: true,
					hasSqueezeButton: true,
					handedness: 'right',
				},
			],
			polyfillInputMapping: {
				axes: [2, 3, 0, 1],
				buttons: [1, 2, null, 0, 3, 4, null],
			},
		},
		'Meta Quest Pro': {
			id: 'Meta Quest Pro',
			name: 'Meta Quest Pro',
			profile: 'meta-quest-touch-pro',
			modes: ['inline', 'immersive-vr', 'immersive-ar'],
			headset: {
				hasPosition: true,
				hasRotation: true,
			},
			controllers: [
				{
					id: 'Meta Quest Touch Pro (Left)',
					buttonNum: 7,
					primaryButtonIndex: 1,
					primarySqueezeButtonIndex: 2,
					hasPosition: true,
					hasRotation: true,
					hasSqueezeButton: true,
					handedness: 'left',
				},
				{
					id: 'Meta Quest Touch Pro (Right)',
					buttonNum: 7,
					primaryButtonIndex: 1,
					primarySqueezeButtonIndex: 2,
					hasPosition: true,
					hasRotation: true,
					hasSqueezeButton: true,
					handedness: 'right',
				},
			],
			polyfillInputMapping: {
				axes: [2, 3, 0, 1],
				buttons: [1, 2, null, 0, 3, 4, null],
			},
		},
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

	let pingJob = null;
	const connection = {
		port: null,
		connect: () => {
			connection.port = chrome.runtime.connect({ name: 'iwe_app' });
			connection.port.onMessage.addListener((message) => {
				switch (message.action) {
					case EMULATOR_ACTIONS.DEVICE_TYPE_CHANGE:
						triggerPolyfillAction(POLYFILL_ACTIONS.DEVICE_TYPE_CHANGE, {
							deviceDefinition: message.deviceDefinition,
						});
						break;
					case EMULATOR_ACTIONS.HEADSET_POSE_CHANGE:
						triggerPolyfillAction(POLYFILL_ACTIONS.HEADSET_POSE_CHANGE, {
							position: message.position,
							quaternion: message.quaternion,
						});
						break;
					case EMULATOR_ACTIONS.CONTROLLER_POSE_CHANGE:
						triggerPolyfillAction(POLYFILL_ACTIONS.CONTROLLER_POSE_CHANGE, {
							objectName: message.objectName,
							position: message.position,
							quaternion: message.quaternion,
						});
						break;
					case EMULATOR_ACTIONS.BUTTON_STATE_CHANGE:
						triggerPolyfillAction(POLYFILL_ACTIONS.BUTTON_STATE_CHANGE, {
							objectName: message.objectName,
							pressed: message.pressed,
							touched: message.touched,
							value: message.value,
							buttonIndex: message.buttonIndex,
						});
						break;
					case EMULATOR_ACTIONS.ANALOG_VALUE_CHANGE:
						triggerPolyfillAction(POLYFILL_ACTIONS.ANALOG_VALUE_CHANGE, {
							objectName: message.objectName,
							value: message.value,
							axisIndex: message.axisIndex,
						});
						break;
					case EMULATOR_ACTIONS.STEREO_TOGGLE:
						triggerPolyfillAction(POLYFILL_ACTIONS.STEREO_TOGGLE, {
							enabled: message.enabled,
						});
						break;
					case EMULATOR_ACTIONS.EXIT_IMMERSIVE:
						triggerPolyfillAction(POLYFILL_ACTIONS.EXIT_IMMERSIVE, {});
						break;
					case EMULATOR_ACTIONS.KEYBOARD_EVENT:
						window.dispatchEvent(
							new KeyboardEvent(message.eventType, message.eventOptions),
						);
						break;
					case EMULATOR_ACTIONS.ROOM_DIMENSION_CHANGE:
						triggerPolyfillAction(POLYFILL_ACTIONS.ROOM_DIMENSION_CHANGE, {
							dimension: message.dimension,
						});
						break;
					case EMULATOR_ACTIONS.INPUT_MODE_CHANGE:
						triggerPolyfillAction(POLYFILL_ACTIONS.INPUT_MODE_CHANGE, {
							inputMode: message.inputMode,
						});
						break;
					case EMULATOR_ACTIONS.HAND_POSE_CHANGE:
						triggerPolyfillAction(POLYFILL_ACTIONS.HAND_POSE_CHANGE, {
							handedness: message.handedness,
							pose: message.pose,
						});
						break;
					case EMULATOR_ACTIONS.PINCH_VALUE_CHANGE:
						triggerPolyfillAction(POLYFILL_ACTIONS.PINCH_VALUE_CHANGE, {
							handedness: message.handedness,
							value: message.value,
						});
						break;
				}
			});
			connection.port.onDisconnect.addListener(connection.connect);
		},
	};
	const triggerPolyfillAction = (action, payload) => {
		window.dispatchEvent(
			new CustomEvent(action, {
				detail:
					typeof cloneInto !== 'undefined' ? cloneInto(payload, window) : payload,
			}),
		);
	};
	const sendActionToEmulator = (action) => {
		try {
			connection.port.postMessage({ action });
		} catch (_e) {
			connection.connect();
			connection.port.postMessage({ action });
		}
	};
	window.addEventListener(
		CLIENT_ACTIONS.ENTER_IMMERSIVE,
		() => {
			sendActionToEmulator(CLIENT_ACTIONS.ENTER_IMMERSIVE);
			if (!pingJob) {
				pingJob = setInterval(() => {
					sendActionToEmulator('ping');
				}, 5000);
			}
		},
		false,
	);
	window.addEventListener(
		CLIENT_ACTIONS.EXIT_IMMERSIVE,
		() => {
			sendActionToEmulator(CLIENT_ACTIONS.EXIT_IMMERSIVE);
		},
		false,
	);
	EmulatorSettings.instance.load().then(() => {
		triggerPolyfillAction(POLYFILL_ACTIONS.DEVICE_INIT, {
			deviceDefinition: DEVICE_DEFINITIONS[EmulatorSettings.instance.deviceKey],
			stereoEffect: EmulatorSettings.instance.stereoOn,
		});
		triggerPolyfillAction(POLYFILL_ACTIONS.ROOM_DIMENSION_CHANGE, {
			dimension: EmulatorSettings.instance.roomDimension,
		});
		triggerPolyfillAction(POLYFILL_ACTIONS.INPUT_MODE_CHANGE, {
			inputMode: EmulatorSettings.instance.inputMode,
		});
		['left', 'right'].forEach((handedness) => {
			triggerPolyfillAction(POLYFILL_ACTIONS.HAND_POSE_CHANGE, {
				handedness: handedness,
				pose: EmulatorSettings.instance.handPoses[handedness + '-hand'],
			});
		});
	});

}));
