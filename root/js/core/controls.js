let camera = { position: [50, 500, 1500], pitch: 0, yaw: 0, moveSpeed: 10, rotateSpeed: 0.001 };
let keys = {};

export function handleKeyDown(event) {
    keys[event.key.toLowerCase()] = true;
}

export function handleKeyUp(event) {
    keys[event.key.toLowerCase()] = false;
}

export function handleMouseMove(event) {
    //if (document.pointerLockElement === gl.canvas)
    //{
    camera.yaw += event.movementX * camera.rotateSpeed;
    camera.pitch -= event.movementY * camera.rotateSpeed;

    // Clamp the pitch to prevent the camera from flipping
    camera.pitch =
        Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.pitch));
    //}
}

export function updateCamera() {
    // Rotation speed
    const rotateTimes = 10;

    // Handle rotation input
    if (keys['i']) {
        camera.pitch += camera.rotateSpeed * rotateTimes;
    }
    if (keys['k']) {
        camera.pitch -= camera.rotateSpeed * rotateTimes;
    }
    if (keys['l']) {
        camera.yaw += camera.rotateSpeed * rotateTimes;
    }
    if (keys['j']) {
        camera.yaw -= camera.rotateSpeed * rotateTimes;
    }

    // Clamp pitch to avoid flipping (optional, if needed)
    const maxPitch = Math.PI / 2 - 0.01;
    const minPitch = -Math.PI / 2 + 0.01;
    camera.pitch = Math.max(minPitch, Math.min(maxPitch, camera.pitch));

    // Calculate direction vector
    const direction = [
        Math.cos(camera.pitch) * Math.sin(camera.yaw),
        Math.sin(camera.pitch),
        -Math.cos(camera.pitch) * Math.cos(camera.yaw)
    ];

    // Right vector
    const right = [
        Math.sin(camera.yaw - Math.PI / 2),
        0,
        Math.cos(camera.yaw - Math.PI / 2)
    ];

    // Up vector
    const up = [0, 1, 0];

    let d_cross_up = vec3.create();
    vec3.cross(d_cross_up, direction, up);

    // Flat direction (ignoring pitch)
    let flatRight = vec3.create();
    vec3.normalize(flatRight, d_cross_up);

    let up_cross_flatright = vec3.create();
    vec3.cross(up_cross_flatright, up, flatRight);

    // Flat direction (ignoring pitch)
    let flatDirection = vec3.create();
    vec3.normalize(flatDirection, up_cross_flatright);

    // Adjust speed based on key presses
    let speed = camera.moveSpeed;
    if (keys['shift']) {
        speed *= 5;
    }

    // Move forward/backward
    if (keys['w']) {
        camera.position[0] += flatDirection[0] * speed;
        camera.position[1] += flatDirection[1] * speed;
        camera.position[2] += flatDirection[2] * speed;
    }
    if (keys['s']) {
        camera.position[0] -= flatDirection[0] * speed;
        camera.position[1] -= flatDirection[1] * speed;
        camera.position[2] -= flatDirection[2] * speed;
    }

    // Strafe left/right
    if (keys['d']) {
        camera.position[0] += flatRight[0] * speed;
        camera.position[1] += flatRight[1] * speed;
        camera.position[2] += flatRight[2] * speed;
    }
    if (keys['a']) {
        camera.position[0] -= flatRight[0] * speed;
        camera.position[1] -= flatRight[1] * speed;
        camera.position[2] -= flatRight[2] * speed;
    }

    // Vertical movement (optional, for flying)
    if (keys['q']) {
        camera.position[1] += speed;
    }
    if (keys['e']) {
        camera.position[1] -= speed;
    }
}


export function getViewMatrix() {
    const direction = [
        Math.cos(camera.pitch) * Math.sin(camera.yaw), Math.sin(camera.pitch), -Math.cos(camera.pitch) * Math.cos(camera.yaw)
    ];
    const up = [0, 1, 0];

    // Assuming we're using gl-matrix library
    return mat4.lookAt(mat4.create(), camera.position,
        vec3.add(vec3.create(), camera.position, direction), up);
}
