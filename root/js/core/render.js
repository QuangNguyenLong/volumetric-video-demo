import * as Controls from "./controls.js";
import * as Shader from "./shader.js";
//
// start here
//

let on_frame_changes = false;
let current_frame;
let gl, programInfo, canvas, buffers;

// Vertex shader program
// Vertex shader
const vsSource = ` attribute vec3 aPosition;
attribute vec3 aColor;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
varying vec3 vColor;
void main() {
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
  vColor = aColor;
  gl_PointSize = 1.0;
}
`;

// Fragment shader
const fsSource = `precision mediump float;
varying vec3 vColor;
void main() { gl_FragColor = vec4(vColor, 1.0); }
`;

export function update_render_frame(frame) {
    on_frame_changes = true;
    current_frame = frame;
}

export function init_render_context() {
    canvas = document.querySelector("#glcanvas");
    gl = canvas.getContext("webgl");

    if (gl === null) {
        alert("Unable to initialize WebGL.");
        return;
    }

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    const shaderProgram = Shader.initShaderProgram(gl, vsSource, fsSource);
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            position: gl.getAttribLocation(shaderProgram, 'aPosition'),
            color: gl.getAttribLocation(shaderProgram, 'aColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    document.addEventListener('keydown', Controls.handleKeyDown);
    document.addEventListener('keyup', Controls.handleKeyUp);
    canvas.addEventListener('mousemove', Controls.handleMouseMove);
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.onclick = () => canvas.requestPointerLock();
}

export function start_render_loop() {
    function loop() {
        if (on_frame_changes) {
            if (buffers) {
                gl.deleteBuffer(buffers.position);
                gl.deleteBuffer(buffers.color);
            }
            buffers = initBuffers(gl, current_frame.positions, current_frame.colors);
            on_frame_changes = false;
        }

        Controls.updateCamera();
        if (buffers) {
            drawScene(gl, programInfo, buffers);
        }
        requestAnimationFrame(loop);
    }
    loop();
}

function initBuffers(gl, positions, colors) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    return { position: positionBuffer, color: colorBuffer, count: positions.length / 3 };
}

function drawScene(gl, programInfo, buffers) {
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 60 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 1;
    const zFar = 10000.0;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    const modelViewMatrix = Controls.getViewMatrix();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.position);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(programInfo.attribLocations.color, 3, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.color);

    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.drawArrays(gl.POINTS, 0, buffers.count);
}



function resizeCanvasToDisplaySize(canvas) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
}
