import { setVoxelSize, init_render_context, start_render_loop, update_render_frame } from "./core/render.js";
import { dlSpdFetch, alloc2DInt64Array } from './core/utils.js';
import { fetchAndParseMpd, extractBandwidthFromMpd } from './dash/mpd.js';
import { WasmDecoder } from "./core/wasm_wrapper.js";

let decoded_gofs = [];
let segment_queue = [];

function update_frames_when_needed_loop() {
    setInterval(() => {
        if (decoded_gofs.length > 0) {
            const frame = decoded_gofs.shift();
            update_render_frame(frame);
        }
    }, 33);
}

async function fetch_video_segment_loop(module, bandwidthMatrix) {
    let index = 1;
    let currBw = 0;
    let bitrates = alloc2DInt64Array(module, bandwidthMatrix);
    while (true) {
        try {
            const url = makeSegmentUrl(module, index, bitrates, currBw);
            const ret = await dlSpdFetch(url);
            currBw = ret.speedBps;
            console.log(`Avg. speed: ${ret.speedBps} Bps`);
            segment_queue.push(ret.buffer);
            index++;

        } catch (e) {
            console.error("Fetch error:", e);
            module.wasmFree(bitrates.ptr);
            return;
        }
    }
}

const arr = [1, 2, 3, 5, 9];

function makeSegmentUrl(module, index, bitrates, currBw) {
    const paddedIndex = String(index).padStart(5, '0');

        const seqVersPtr = module.wasmMalloc(bitrates.seqCount); // seqCount because each version is store with uint8_t.

        module.wasmPcsEqualLodSelect(bitrates.seqCount, bitrates.repCount, bitrates.ptr, currBw, seqVersPtr);
        const jsVersions = Array.from(new Uint8Array(module._module.HEAPU8.buffer, seqVersPtr, bitrates.seqCount));

        setVoxelSize(arr[jsVersions[0]] * 2);
        module.wasmFree(seqVersPtr);

        return `./0.seg${paddedIndex}.r${jsVersions[0]}.bin?nocache=${Date.now()}`;
}

async function startProcessing() {
    const xmlDoc = await fetchAndParseMpd('./manifest.mpd');
    const bandwidthMatrix = extractBandwidthFromMpd(xmlDoc);
    console.log(`Bandwidth matrix: ${bandwidthMatrix}`);

    let module = new WasmDecoder();
    await module.ready();

    init_render_context();
    decode_video_segment_to_frames_loop();
    update_frames_when_needed_loop();
    fetch_video_segment_loop(module, bandwidthMatrix);
    start_render_loop();

}

function decode_video_segment_to_frames_loop() {
    setInterval(() => {
        if (segment_queue.length > 0) {
            const segment = segment_queue.shift();
            decoderWorker.postMessage({ type: 'decode', segment }, [segment]); // transfer buffer
        }
    }, 10);
}

const decoderWorker = new Worker('js/workers/decode_worker.js', { type: 'module' });

decoderWorker.onmessage = function(e) {
    if (e.data.type === 'ready') {
        console.log('[Main] Decoder worker ready');
        startProcessing();
    } else if (e.data.type === 'decoded') {
        decoded_gofs.push(...e.data.frames);
    }
};
