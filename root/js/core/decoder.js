import { WasmDecoder } from './wasm_wrapper.js';

export class VideoDecoder {
    constructor(wasmInstance) {
        this.wasm = wasmInstance;
    }

    static async create() {
        const wasm = new WasmDecoder();
        await wasm.ready(); // Wait for WASM fully ready
        return new VideoDecoder(wasm);
    }

    decode(buffer, gof) {
        const uint8Buffer = new Uint8Array(buffer);

        const rbufPtr = this.wasm.wasmMalloc(uint8Buffer.length);
        this.wasm._module.HEAPU8.set(uint8Buffer, rbufPtr);

        const numPtr = this.wasm.wasmMalloc(4);
        this.wasm._module.HEAPU32[numPtr >> 2] = 0;

        const dataPtr = this.wasm.wasmPcsFilrgPccBufferToGof(
            rbufPtr, uint8Buffer.length, numPtr);

        const numFrames = this.wasm._module.HEAPU32[numPtr >> 2];

        for (let i = 0; i < numFrames; i++) {
            const pcPtr = this.wasm.wasmPcsGofGetFrame(dataPtr, i);
            const positionsPtr = this.wasm.wasmPcsFilrgPccFrameGetPositions(pcPtr);
            const colorsPtr = this.wasm.wasmPcsFrameGetColors(pcPtr);
            const size = this.wasm.wasmPcsFrameGetSize(pcPtr);

            const positions = new Float32Array(
                this.wasm._module.HEAPF32.buffer, positionsPtr, size * 3);
            const colors = new Uint8Array(
                this.wasm._module.HEAPU8.buffer, colorsPtr, size * 3);

            const positionsCopy = new Float32Array(size * 3);
            positionsCopy.set(positions); // Copy data out of WASM

            const colorsCopy = new Uint8Array(size * 3);
            colorsCopy.set(colors); // Copy data out of WASM

            gof.push({
                positions: positionsCopy,
                colors: colorsCopy,
                size,
            });
        }

        gof.size = numFrames;

        this.wasm.wasmFree(numPtr);
        this.wasm.wasmFree(rbufPtr);
    }
}