import { Scene } from "./render/core/scene.js";
import { Node } from "./render/core/node.js";

const globalUTF8TextDecoder = new TextDecoder("utf-8");
const globalUTF8TextEncoder = new TextEncoder("utf-8");
export function utf8Encoder() {
	return globalUTF8TextEncoder;
}
export function utf8Decoder() {
	return globalUTF8TextDecoder;
}

//console.log(wasm_module._increment(12));

let scene_ = new Scene();
export let gltfRoot = scene_.addNode(new Node());

export function scene() {
	return scene_;
}

export function setScene(s) {
	scene_ = s;
}

let sceneNames_ = "";

let gpuCtx_ = null;
export function setGPUCtx(gpuCtx) {
	gpuCtx_ = gpuCtx;
}

export function gpuCtx() {
	return gpuCtx_;
}

export function demoNames() {
	return sceneNames_;
}

export function setDemoNames(names) {
	sceneNames_ = names;
}

let xrEntryUI_ = null;
export function setXREntry(UIType) {
	xrEntryUI_ = UIType;
}
export function xrEntryUI() {
	return xrEntryUI_;
}

let isImmersive_ = false;

export function setIsImmersive(flag) {
	return isImmersive_ = flag;
}

export function isImmersive() {
	return isImmersive_;
}

let verbosePrint_ = false;
export function setVerbosePrint(state) 
{
	verbosePrint_ = state;
}
export function isVerbosePrint(state)
{
	return verbosePrint_;
}
