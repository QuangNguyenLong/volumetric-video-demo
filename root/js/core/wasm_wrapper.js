import createWasmDecoder from 'https://filrg.github.io/pcs/pcs_wasm.js';

export async function loadWasmDecoder() {
    const Module = await pcs_wasm_init();
    return Module;
}
export class WasmDecoder {
    constructor() {
        this._ready = this._init(); // Expose a promise to wait on
    }

    async _init() {
        this._module = await createWasmDecoder();
        console.log(`wasm loaded successfully.`);
        this._api = {
            // uint32_t wasm_pcs_harmonic_bw_estimate(pcs_bw_t *bw_arr, uint32_t arr_len, pcs_bw_t *bw_es);
            wasm_pcs_harmonic_bw_estimate: this._module.cwrap(
                'wasm_pcs_harmonic_bw_estimate',
                'number', ['number', 'number', 'number']
            ),

            // uint32_t wasm_pcs_velocity_viewport_estimate(..., float* esMVP);
            wasm_pcs_velocity_viewport_estimate: this._module.cwrap(
                'wasm_pcs_velocity_viewport_estimate',
                'number', [
                    'number', // delta_t
                    'number', 'number', 'number', // p_curr_x/y/z
                    'number', 'number', 'number', // p_old_x/y/z
                    'number', 'number', 'number', // v_curr_x/y/z
                    'number', 'number', 'number', // v_old_x/y/z
                    'number', // estimate_duration
                    'number', // esMVP (float*)
                ]
            ),

            // uint32_t wasm_pcs_hull_visibility_compute(float* esMVP, const char* hull_data, uint32_t hull_size, float* screen_area);
            wasm_pcs_hull_visibility_compute: this._module.cwrap(
                'wasm_pcs_hull_visibility_compute',
                'number', ['number', 'number', 'number', 'number']
            ),

            wasm_pcs_equal_lod_select: this._module.cwrap(
                'wasm_pcs_equal_lod_select',
                'number', // return type: uint32_t
                [
                    'number', // uint32_t seq_count
                    'number', // uint32_t rep_count
                    'number', // void* attrib, this is 2D bitrate actually
                    'number', // uint32_t bandwidth
                    'number' // pcs_lod_version_t* seq_vers
                ]
            ),
            // pcs_point_cloud_t* wasm_pcs_filrg_pcc_buffer_to_gof(const char* data, uint32_t size, uint32_t* num);
            wasm_pcs_filrg_pcc_buffer_to_gof: this._module.cwrap(
                'wasm_pcs_filrg_pcc_buffer_to_gof',
                'number', ['number', 'number', 'number']
            ),

            // pcs_point_cloud_t* wasm_pcs_gof_get_frame(pcs_point_cloud_t* gof, int index);
            wasm_pcs_gof_get_frame: this._module.cwrap(
                'wasm_pcs_gof_get_frame',
                'number', ['number', 'number']
            ),

            // pcs_filrg_pcc_coord_t* wasm_pcs_filrg_pcc_frame_get_positions(pcs_point_cloud_t* frame);
            wasm_pcs_filrg_pcc_frame_get_positions: this._module.cwrap(
                'wasm_pcs_filrg_pcc_frame_get_positions',
                'number', ['number']
            ),

            // uint8_t* wasm_pcs_frame_get_colors(pcs_point_cloud_t* frame);
            wasm_pcs_frame_get_colors: this._module.cwrap(
                'wasm_pcs_frame_get_colors',
                'number', ['number']
            ),

            // uint32_t wasm_pcs_frame_get_size(pcs_point_cloud_t* frame);
            wasm_pcs_frame_get_size: this._module.cwrap(
                'wasm_pcs_frame_get_size',
                'number', ['number']
            ),

            // void wasm_free(void* ptr);
            wasm_free: this._module.cwrap(
                'wasm_free',
                null, ['number']
            ),

            // void* wasm_malloc(uint32_t size);
            wasm_malloc: this._module.cwrap(
                'wasm_malloc',
                'number', ['number']
            ),
            add: this._module.cwrap(
                'add',
                'number', ['number', 'number']
            ),
        };
    }

    // Expose a way to wait for initialization
    async ready() {
        await this._ready;
        return this;
    }

    wasmPcsHarmonicBwEstimate(bwArrPtr, bwArrLen, bwEsPtr) {
        return this._api.wasm_pcs_harmonic_bw_estimate(bwArrPtr, bwArrLen, bwEsPtr);
    }

    wasmPcsVelocityViewportEstimate(
        deltaT,
        pCurrX,
        pCurrY,
        pCurrZ,
        pOldX,
        pOldY,
        pOldZ,
        vCurrX,
        vCurrY,
        vCurrZ,
        vOldX,
        vOldY,
        vOldZ,
        estimateDuration,
        esMVPPtr) {
        return this._api.wasm_pcs_velocity_viewport_estimate(
            deltaT,
            pCurrX,
            pCurrY,
            pCurrZ,
            pOldX,
            pOldY,
            pOldZ,
            vCurrX,
            vCurrY,
            vCurrZ,
            vOldX,
            vOldY,
            vOldZ,
            estimateDuration,
            esMVPPtr
        );
    }

    wasmPcsHullVisibilityCompute(esMVPPtr, hullBuffPtr, hullBuffSize, screenAreaPtr) {
        return this._api.wasm_pcs_hull_visibility_compute(esMVPPtr, hullBuffPtr, hullBuffSize, screenAreaPtr);
    }

    wasmPcsEqualLodSelect(seqCount, repCount, bitratePtr, bandwidth, seqVersionsPtr) {
        return this._api.wasm_pcs_equal_lod_select(seqCount, repCount, bitratePtr, bandwidth, seqVersionsPtr);
    }

    wasmPcsFilrgPccBufferToGof(rbufPtr, rbufLen, numPtr) {
        return this._api.wasm_pcs_filrg_pcc_buffer_to_gof(rbufPtr, rbufLen, numPtr);
    }
    wasmPcsGofGetFrame(pcListPtr, index) {
        return this._api.wasm_pcs_gof_get_frame(pcListPtr, index);
    }
    wasmPcsFilrgPccFrameGetPositions(pcPtr) {
        return this._api.wasm_pcs_filrg_pcc_frame_get_positions(pcPtr);
    }
    wasmPcsFrameGetColors(pcPtr) {
        return this._api.wasm_pcs_frame_get_colors(pcPtr);
    }
    wasmPcsFrameGetSize(pcPtr) {
        return this._api.wasm_pcs_frame_get_size(pcPtr);
    }
    wasmFree() {
        return this._api.wasm_free();
    }
    wasmMalloc(size) {
        return this._api.wasm_malloc(size);
    }
}
