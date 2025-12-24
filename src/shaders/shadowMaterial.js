import * as THREE from 'three';

export function makeDashedLineShadowMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0.0,
  });

  mat.onBeforeCompile = (shader) => {
    const usesPCFragColor = shader.fragmentShader.includes("pc_fragColor");
    const outVar = usesPCFragColor ? "pc_fragColor" : "gl_FragColor";

    /* ============================
      Vertex shader modifications
      ============================ */

    // (No longer required for the hatch itself, but keeping your varying is harmless if used elsewhere.)
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `
      #include <common>
      varying vec3 vObjectPosition;
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      vObjectPosition = position;
      `
    );

    /* ============================
      Fragment shader modifications
      ============================ */

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `
        #include <common>
        varying vec3 vObjectPosition;

        // screenXY: pixel coords (gl_FragCoord.xy)
        // periodPx: distance between lines in pixels
        // lineWidthPx: thickness in pixels
        // angle: rotation in radians in screen plane
        float diagLinesMask(vec2 screenXY, float periodPx, float lineWidthPx, float angle)
        {
            float c = cos(angle);
            float s = sin(angle);

            // Rotate in screen plane
            vec2 rotated = vec2(
                c * screenXY.x - s * screenXY.y,
                s * screenXY.x + c * screenXY.y
            );

            // Coordinate along the diagonal direction, in "period units"
            float u = (rotated.x + rotated.y) / periodPx;
            float f = fract(u);

            // Convert pixel width -> fraction of one period (clamped to [0..0.5])
            float w = clamp(lineWidthPx / periodPx, 0.0, 0.5);

            // Anti-alias using derivative of u
            float aa = fwidth(u);

            // Distance to the nearest edge of the line band (at f=0 and f=1)
            float band = min(f, 1.0 - f);

            // 1 inside the band, 0 outside, softened by aa
            return 1.0 - smoothstep(w, w + aa, band);
        }
      `
    );

    /* ============================
      Final color override
      ============================ */

    shader.fragmentShader = shader.fragmentShader.replace(
      /}\s*$/,
      `
        vec3 currentRGB = ${outVar}.rgb;

        // Luminance of the shaded surface
        float val = dot(currentRGB, vec3(0.2126, 0.7152, 0.0722));

        // Smooth black/white classification
        float threshold = 0.3;
        float edge = fwidth(val);
        float bw = smoothstep(threshold - edge, threshold + edge, val);
        // bw = 0 -> black region, bw = 1 -> white region

        // Hatch parameters (SCREEN SPACE)
        float periodPx = 12.0;     // pixels between lines
        float lineWidthPx = 1.5;   // pixels thick
        float angle = 0.0;         // radians

        // Screen-space hatch
        float hatch = diagLinesMask(gl_FragCoord.xy, periodPx, lineWidthPx, angle);

        // Blend hatch into black region, solid white elsewhere
        float colorBW = mix(hatch, 1.0, bw);

        ${outVar} = vec4(vec3(colorBW), ${outVar}.a);
      }
      `
    );

    mat.userData.shader = shader;
  };

  mat.needsUpdate = true;
  return mat;
}



export function makeDotShadowMaterial() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0
    });

    mat.onBeforeCompile = (shader) => {
      const usesPCFragColor = shader.fragmentShader.includes('pc_fragColor');
      const outVar = usesPCFragColor ? 'pc_fragColor' : 'gl_FragColor';

      /* ============================
        Fragment shader modifications
        ============================ */

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
          #include <common>

          // Screen-space dot mask in *pixel* units using gl_FragCoord.xy.
          // fragPx: pixel coords (gl_FragCoord.xy)
          // periodPx: spacing between dot centers (pixels)
          // radiusPx: dot radius (pixels)
          // angle: rotation (radians)
          float dotMaskPx(vec2 fragPx, float periodPx, float radiusPx, float angle)
          {
            float c = cos(angle);
            float s = sin(angle);

            // Rotate around origin in screen space
            vec2 r = vec2(
              c * fragPx.x - s * fragPx.y,
              s * fragPx.x + c * fragPx.y
            );

            // Repeating cell centered at 0 in pixel units
            vec2 cell = fract(r / periodPx + 0.5) - 0.5;

            // Pixel distance to dot center
            float d = length(cell * periodPx);

            // Anti-alias in pixel space
            float aa = fwidth(d);

            return smoothstep(radiusPx - aa, radiusPx + aa, d);
          }
        `
      );

      /* ============================
        Final color override
        ============================ */

      shader.fragmentShader = shader.fragmentShader.replace(
        /}\s*$/,
        `
          vec3 currentRGB = ${outVar}.rgb;

          // Luminance of the shaded surface
          float val = dot(currentRGB, vec3(0.2126, 0.7152, 0.0722));

          // Smooth black/white classification
          float threshold = 0.5;
          float edge = fwidth(val);
          float bw = smoothstep(threshold - edge, threshold + edge, val);
          // bw = 0 -> "black region", bw = 1 -> "white region"

          // Pixel coords (no stretching)
          vec2 fragPx = gl_FragCoord.xy;

          // Dot parameters in pixels
          float periodPx = 8.0; // spacing in pixels
          float angle    = 0.0; // rotate dot grid if desired

          // Radius selection based on luminance
          float radiusPx;
          if (val < 0.1) {
            radiusPx = 3.0;
          } else if (val < 0.3) {
            radiusPx = 2.0;
          } else {
            radiusPx = 1.0;
          }

          float dots = dotMaskPx(fragPx, periodPx, radiusPx, angle);

          // Dots in the black region, solid white elsewhere
          float colorBW = mix(dots, 1.0, bw);

          ${outVar} = vec4(vec3(colorBW), ${outVar}.a);

        }
        `
      );

      mat.userData.shader = shader;
    };

    mat.needsUpdate = true;
    return mat;
}

export function makeNoiseShadowMaterial(
    mode = "new",                 // "new" | "original"
    originalMaterial = null       // pass mesh.material here if mode === "original"
  ) {
    const noiseTexturePath = '/noise/noise3.png';
    const noiseTexture = new THREE.TextureLoader().load(noiseTexturePath);

    // Decide base material:
    // - "new": create your MeshStandardMaterial
    // - "original": clone the model's material (preserves its textures/settings)
    let mat;
    if (mode === "original" && originalMaterial) {
      mat = originalMaterial.clone();
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1.0,
        metalness: 0.0,
      });
    }

    // Texture setup for mask usage
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;
    noiseTexture.minFilter = THREE.LinearMipmapLinearFilter;
    noiseTexture.magFilter = THREE.LinearFilter;
    noiseTexture.generateMipmaps = true;

    mat.onBeforeCompile = (shader) => {
      const usesPCFragColor = shader.fragmentShader.includes("pc_fragColor");
      const outVar = usesPCFragColor ? "pc_fragColor" : "gl_FragColor";

      // ---- Uniforms ----
      shader.uniforms.uNoiseTex = { value: noiseTexture };

      // How many times the noise repeats across UV 0..1
      shader.uniforms.uNoiseTiling = { value: 1.0 };

      // ---- Ensure vUv exists in fragment shader ----
      // MeshStandardMaterial usually already has UVs, but this makes it robust.
      if (!shader.vertexShader.includes("varying vec2 vUv")) {
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            `
            #include <common>
            varying vec2 vUv;
            `
          )
          .replace(
            "#include <uv_vertex>",
            `
            #include <uv_vertex>
            vUv = uv;
            `
          );
      }

      if (!shader.fragmentShader.includes("varying vec2 vUv")) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `
          #include <common>
          varying vec2 vUv;

          uniform sampler2D uNoiseTex;
          uniform float uNoiseTiling;

          // UV-space noise lookup (sticks to mesh)
          float noiseMaskUV(vec2 uv, float tiling) {
            vec2 nuv = uv * tiling;
            return texture2D(uNoiseTex, nuv).r;
          }
          `
        );
      } else {
        // vUv exists, just inject uniforms + helper
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `
          #include <common>

          uniform sampler2D uNoiseTex;
          uniform float uNoiseTiling;

          float noiseMaskUV(vec2 uv, float tiling) {
            vec2 nuv = uv * tiling;
            return texture2D(uNoiseTex, nuv).r;
          }
          `
        );
      }

      // ---- Append your mask logic at the end ----
      shader.fragmentShader = shader.fragmentShader.replace(
        /}\s*$/,
        `
          vec3 currentRGB = ${outVar}.rgb;

          // Luminance
          float val = dot(currentRGB, vec3(0.2126, 0.7152, 0.0722));

          // Noise sample in UV space (0..1)
          float n = noiseMaskUV(vUv, uNoiseTiling);

          // Luminance-driven noise contrast
          float cutoff;
          if (val < 0.3) {
            cutoff = 0.7;
          } else if (val < 0.6) {
            cutoff = 0.6;
          } else {
            cutoff = 0.5;
          }

          float aa = fwidth(n);
          float noiseBW = smoothstep(cutoff - aa, cutoff + aa, n);

          // Output BW mask (same as your original)
          float colorBW = noiseBW;

          ${outVar} = vec4(currentRGB * colorBW, ${outVar}.a);
        }
        `
      );

      mat.userData.shader = shader;
    };

    mat.needsUpdate = true;
    return mat;
}