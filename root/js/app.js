import { init_render_context, start_render_loop, update_render_frame } from "./core/render.js";
import { dlSpdFetch, alloc2DInt64Array } from './core/utils.js';
import { fetchAndParseMpd, extractBandwidthFromMpd } from './dash/mpd.js';
import { WasmDecoder } from "./core/wasm_wrapper.js";

let decoded_gofs = [];
let segment_queue = [];
const pendingSegments = [];
let currBw = 0;

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
    const bitrates = alloc2DInt64Array(module, bandwidthMatrix);

    while (true) {
        try {
            const url = makeSegmentUrl(module, index, bitrates, currBw);

            const t0 = performance.now();
            const ret = await dlSpdFetch(url);
            const t1 = performance.now();

            const fetchTime = (t1 - t0) / 1000;
            const fetchSize = ret.buffer.byteLength;

            segment_queue.push({ buffer: ret.buffer, fetchTime, fetchSize });
            index++;
        } catch (e) {
            console.error("Fetch error:", e);
            module.wasmFree(bitrates.ptr);
            return;
        }
    }
}

function makeSegmentUrl(module, index, bitrates, currBw) {
    const paddedIndex = String(index).padStart(5, '0');
    const seqVersPtr = module.wasmMalloc(bitrates.seqCount);

    module.wasmPcsEqualLodSelect(
        bitrates.seqCount,
        bitrates.repCount,
        bitrates.ptr,
        currBw,
        seqVersPtr
    );

    const jsVersions = Array.from(
        new Uint8Array(module._module.HEAPU8.buffer, seqVersPtr, bitrates.seqCount)
    );

    module.wasmFree(seqVersPtr);
    return `./0.seg${paddedIndex}.r${jsVersions[0]}.bin?nocache=${Date.now()}`;
}

function decode_video_segment_to_frames_loop() {
    setInterval(() => {
        if (segment_queue.length > 0) {
            const { buffer, fetchTime, fetchSize } = segment_queue.shift();
            const decodeStart = performance.now();

            pendingSegments.push({ fetchTime, fetchSize, decodeStart });

            decoderWorker.postMessage({ type: 'decode', segment: buffer }, [buffer]);
        }
    }, 10);
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

const decoderWorker = new Worker('js/workers/decode_worker.js', { type: 'module' });

decoderWorker.onmessage = function (e) {
    if (e.data.type === 'ready') {
        console.log('[Main] Decoder worker ready');
        startProcessing();
    } else if (e.data.type === 'decoded') {
        const decodeEnd = performance.now();

        const timing = pendingSegments.shift();
        const decodeTime = (decodeEnd - timing.decodeStart) / 1000;
        const effectiveBw = timing.fetchSize / (timing.fetchTime + decodeTime);

        currBw = effectiveBw;
        console.log(`Effective bandwidth: ${Math.round(effectiveBw)} Bps`);

        decoded_gofs.push(...e.data.frames);
    }
};

