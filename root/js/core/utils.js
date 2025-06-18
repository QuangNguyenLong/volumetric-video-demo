export async function dlSpdFetch(url) {
    const startTime = performance.now();

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Fetch failed with status: ${response.status}`);
    }

    const reader = response.body.getReader();
    let receivedLength = 0;
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        receivedLength += value.length;
        chunks.push(value);
    }

    const endTime = performance.now();
    const durationSeconds = (endTime - startTime) / 1000;
    const speedBps = receivedLength / durationSeconds;
    const speedMbps = (speedBps * 8) / (1000 * 1000);

    // Reconstruct a single ArrayBuffer from chunks
    const fullBuffer = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
        fullBuffer.set(chunk, position);
        position += chunk.length;
    }

    // Return both buffer and speed
    return {
        buffer: fullBuffer.buffer, // Extract ArrayBuffer from Uint8Array
        speedMbps,
        speedBps
    };
}
export function alloc2DInt64Array(module, array2D) {
    const seqCount = array2D.length;
    const repCount = array2D[0].length;

    // Allocate flat array buffer for int64_t values
    const totalElements = seqCount * repCount;
    const bytesPerElement = 8; // int64_t
    const bufferSize = totalElements * bytesPerElement;

    // Allocate memory in WASM heap
    const ptr = module.wasmMalloc(bufferSize);

    // Flatten and copy to WASM memory
    const heap64 = new BigInt64Array(module._module.HEAP8.buffer, ptr, totalElements);

    for (let i = 0; i < seqCount; ++i) {
        for (let j = 0; j < repCount; ++j) {
            const index = i * repCount + j;
            heap64[index] = BigInt(array2D[i][j]); // convert JS number to BigInt
        }
    }

    return { ptr, seqCount, repCount };
}