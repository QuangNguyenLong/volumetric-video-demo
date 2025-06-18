// decoder_worker.js
import { VideoDecoder } from '../core/decoder.js';

console.log("Worker started");
let vddc = null;

async function init() {
    vddc = await VideoDecoder.create();
    postMessage({ type: 'ready' });
}

init();

onmessage = (e) => {
    if (e.data.type === 'decode') {
        const frames = [];
        vddc.decode(e.data.segment, frames);
        postMessage({ type: 'decoded', frames });
    }
};