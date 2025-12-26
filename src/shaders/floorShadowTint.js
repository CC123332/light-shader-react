// src/shaders/floorShadowTint.js
export const floorVertexShader = /* glsl */ `
    // floorVertexShader
    precision highp float;

    uniform mat4 uShadowMatrix;

    varying vec4 vShadowCoord;

    void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);

    // Project into shadow map space (includes bias matrix)
    vShadowCoord = uShadowMatrix * worldPos;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

export const floorFragmentShader = /* glsl */ `
    // floorFragmentShader
    precision highp float;

    uniform sampler2D uShadowMap;
    varying vec4 vShadowCoord;

    uniform vec3 uFloorColor;
    uniform vec3 uShadowTint;

    void main() {
        // Perspective divide
        vec3 proj = vShadowCoord.xyz / vShadowCoord.w;

        // If outside shadow map, paint magenta (easy to spot)
        if (
            proj.x < 0.0 || proj.x > 1.0 ||
            proj.y < 0.0 || proj.y > 1.0
        ) {
            gl_FragColor = vec4(.0, 0.0, .0, 1.0);
            return;
        }

        // Sample raw shadow map
        vec4 shadowTexel = texture2D(uShadowMap, proj.xy);

        float mask = step(0.9, shadowTexel.r);

        vec3 color = mix(uShadowTint, uFloorColor, mask);

        gl_FragColor = vec4(color, 1.0);
    }
`;

