let wasmModGlobal = null;

export function wasmSetModule(wasmMod) {
	wasmModGlobal = wasmMod;
}

export function wasmModule() {
	return wasmModGlobal;
}

export function wasmCopyBufToFrom(dst, src) {
   dst.set(src, src.length);
}

const _wasmF32   = new Float32Array(1);
const _wasmF64   = new Float64Array(1);
const _wasmInt32   = new Int32Array(1);
const _wasmUInt32  = new Uint32Array(1);
const _wasmUInt64  = new BigUint64Array(1);
const _wasmInt64  = new BigInt64Array(1);
const _wasmF32_4   = new Float32Array(1);
const _wasmF64_4   = new Float64Array(1);
export function wasmF32(val) {
	_wasmF32[0] = val;
	return _wasmF32[0];
}

export function wasmArrayAsF32(ptr, count) {
	return wasmModule().HEAPF32.subarray(
    ptr/Float32Array.BYTES_PER_ELEMENT,
    ptr/Float32Array.BYTES_PER_ELEMENT + count);
}

export function wasmAlloc(byteCount) {
	return wasmModule()._w_alloc(byteCount);
}
export function wasmFree(ptr) {
	wasmModule()._w_free(ptr);
}

export function wasmVec2(x, y) {
    const dataptr = wasmAlloc(Float32Array.BYTES_PER_ELEMENT * 2);
    const asf32 = wasmArrayAsF32(dataptr, 2);

	asf32[0] = x;
	asf32[1] = y;

	return dataptr;
}
export function wasmVec3(x, y, z) {
	const dataptr = wasmAlloc(Float32Array.BYTES_PER_ELEMENT * 3);
	const asf32 = wasmArrayAsF32(dataptr, 3);

	asf32[0] = x;
	asf32[1] = y;
	asf32[2] = z;

	return dataptr;
}
export function wasmVec4(x, y, z, w) {
	const dataptr = wasmAlloc(Float32Array.BYTES_PER_ELEMENT * 4);
	const asf32 = wasmArrayAsF32(dataptr, 4);

	asf32[0] = x;
	asf32[1] = y;
	asf32[2] = z;
	asf32[3] = w;

	return dataptr;
}
export function wasmUint32(val) {
	_wasmUInt32[0] = val;
	return _wasmUInt32[0]
}
export function wasmInt32(val) {
	_wasmInt32[0] = val;
	return _wasmInt32[0];
}

export function wasmInt64(val) {
   _wasmInt64[0] = Number(val);
   return _wasmInt64[0];
}
export function wasmUInt64(val) {
   _wasmUInt64[0] = val.toString();
   return _wasmUInt64[0];
}
export function wasmUInt32(val) {
   _wasmUInt32[0] = val
   return _wasmUInt32[0];
}
export function wasmToNum(val) {
   _wasmInt32[0] = Number(val);
   return _wasmInt32[0];
}

export function wasmToStr(wasm, data, byteLength) {
	const buf = new Uint8Array(wasm.asm.memory.buffer, data, byteLength);
	return globalUTF8TextDecoder.decode(data);
}

export function strToWasm(str) {
	return globalUTF8TextEncoder.encode(str);
}

function wasmTypesTest() {
   const wasm = wasmModule();
	wasm._test_data_types(
		1,
      wasmUInt64(256),
		0.6,
		wasmVec2(0.5, 1.0),
		wasmVec3(0.5, 1.0, 1.5),
		wasmVec4(0.5, 1.0, 1.5, 2.0),
	);
}
function wasmBufferFillTest() {
   const wasm = wasmModule();
   const sizeofVertex = wasmToNum(wasm._Vertex_sizeof());
   console.log("size of vertex=[", sizeofVertex, "]");
   const v_buf_ptr = wasmAlloc(sizeofVertex * 256);
   wasm._test_vertex_buffer_fill(v_buf_ptr, 256);
   wasmFree(v_buf_ptr);
}
function wasmSnapshotSaveRestoreTest() {
   const wasm = wasmModule();
   let snapshots = [];
   console.log("snapshot saves...");
   const asU8Buffer = new Uint8Array(wasm.asm.memory.buffer);
   for (let i = 0; i < 4; i += 1) {
      console.log("snapshot count=[", wasm._test_get_snapshot_count(), "]");
      let snapshot = new Uint8Array(asU8Buffer);

      snapshots.push(snapshot);
      wasm._test_next_snapshot();
   }
   console.log("snapshot restores...");
   for (let i = 0; i < 4; i += 1) {
      const snapshot = snapshots[i];
      
      console.time("restore snapshot");
      asU8Buffer.set(snapshot);
      console.timeEnd("restore snapshot");

      console.log("snapshot count=[", wasm._test_get_snapshot_count(), "]");
   }
   
}
const wasmTests = [wasmTypesTest, wasmBufferFillTest, wasmSnapshotSaveRestoreTest];

export function wasmRunTests() {
   for (let i = 0; i < wasmTests.length; i += 1) {
      console.log("wasm test", i);
      wasmTests[i]();
   }
}
