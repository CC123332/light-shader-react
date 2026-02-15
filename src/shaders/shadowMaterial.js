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
    const noiseTexturePath = '/noise/noise4.png';
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

      // ---- Append mask logic at the end ----
      shader.fragmentShader = shader.fragmentShader.replace(
        /}\s*$/,
        `
          vec3 currentRGB = ${outVar}.rgb;

          // Luminance
          float val = dot(currentRGB, vec3(0.2126, 0.7152, 0.0722));

          // Noise sample in UV space (0..1)
          float n = noiseMaskUV(vUv, uNoiseTiling);

          // Output BW mask
          float colorBW = n * val + 0.2;

          ${outVar} = vec4(currentRGB * colorBW, ${outVar}.a);
        }
        `
      );

      mat.userData.shader = shader;
    };

    mat.needsUpdate = true;
    return mat;
}

export function makeHologramMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    depthWrite: false,
  });

  mat.onBeforeCompile = (shader) => {
    const usesPCFragColor = shader.fragmentShader.includes("pc_fragColor");
    const outVar = usesPCFragColor ? "pc_fragColor" : "gl_FragColor";

    // ----------------------------
    // Vertex: pass skinned world pos
    // ----------------------------
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `
      #include <common>
      varying vec3 vWorldPos;
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <worldpos_vertex>",
      `
      #include <worldpos_vertex>
      vWorldPos = worldPosition.xyz;
      `
    );

    // ----------------------------
    // Fragment: dot utilities
    // ----------------------------
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `
      #include <common>
      varying vec3 vWorldPos;

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      vec2 hash22(vec2 p) {
        float n = hash12(p);
        return vec2(n, hash12(p + n + 19.19));
      }

      // Centers in "p-space" (world-projected), but radius measured in PIXELS.
      // p: 2D coordinate used for cell tiling/jitter (in arbitrary units)
      // period: spacing between dot centers in p-units
      // radiusPx: dot radius in SCREEN pixels (round and camera-facing)
      float jitterDotMask_CentersInP_RoundInPixels(
        vec2 p,
        float period,
        float radiusPx,
        float seed
      ) {
        vec2 cellId = floor(p / period);
        vec2 local  = (fract(p / period) - 0.5) * period;

        vec2 rnd    = hash22(cellId + seed) - 0.5;
        vec2 center = rnd * (period * 0.85);

        // Delta in p-space from dot center
        vec2 dpSpace = local - center;

        // Convert dpSpace -> pixel delta via inverse Jacobian of p w.r.t. screen pixels
        vec2 dpdx = dFdx(p);
        vec2 dpdy = dFdy(p);

        float det = dpdx.x * dpdy.y - dpdx.y * dpdy.x;

        // Degenerate safeguard
        if (abs(det) < 1e-10) return 0.0;

        vec2 dPix;
        dPix.x = ( dpSpace.x * dpdy.y - dpSpace.y * dpdy.x) / det;
        dPix.y = (-dpSpace.x * dpdx.y + dpSpace.y * dpdx.x) / det;

        float dPx = length(dPix);
        float aa  = fwidth(dPx);

        return 1.0 - smoothstep(radiusPx - aa, radiusPx + aa, dPx);
      }


      // Triplanar world projection for centers (prevents obvious planar projection artifacts).
      // Uses view-space normal (vNormal) for weights; good enough for this purpose.
      float dotMaskTriplanarWorld(vec3 worldPos, vec3 nView, float spacingWorld, float radiusPx, float seed)
      {
        // Convert world units -> "cell space": 1 unit per spacingWorld
        float invSpacing = 1.0 / max(spacingWorld, 1e-6);

        // p-space coords for each plane
        vec2 pXY = worldPos.xy * invSpacing;
        vec2 pXZ = worldPos.xz * invSpacing;
        vec2 pYZ = worldPos.yz * invSpacing;

        // Triplanar blend weights from normal (view space is fine here)
        vec3 w = abs(normalize(nView));
        w = max(w, vec3(1e-4));
        w /= (w.x + w.y + w.z);

        // period=1.0 means one dot cell per "spacingWorld"
        float period = 2.0;

        float mXY = jitterDotMask_CentersInP_RoundInPixels(pXY, period, radiusPx, seed + 11.0);
        float mXZ = jitterDotMask_CentersInP_RoundInPixels(pXZ, period, radiusPx, seed + 23.0);
        float mYZ = jitterDotMask_CentersInP_RoundInPixels(pYZ, period, radiusPx, seed + 37.0);

        // Weight mapping:
        // - XY is most appropriate when normal points along Z (w.z)
        // - XZ when normal points along Y (w.y)
        // - YZ when normal points along X (w.x)
        return mYZ * w.x + mXZ * w.y + mXY * w.z;
      }
      `
    );

    // ----------------------------
    // Final output
    // ----------------------------
    shader.fragmentShader = shader.fragmentShader.replace(
      /}\s*$/,
      `
      vec3 currentRGB = ${outVar}.rgb;
      float val = dot(currentRGB, vec3(0.2126, 0.7152, 0.0722));

      // --- Controls ---
      float seed = 13.37;

      // Dot spacing in WORLD UNITS (meters in most rigs, but depends on your scale).
      // Example: 0.03 = one cell every 3 cm.
      float spacingWorld = 0.05;

      // Dot radius in SCREEN PIXELS (always round)
      float radiusPx = 2.0;

      // vNormal exists in MeshStandardMaterial fragment; it is in view space.
      // Using it is sufficient for triplanar weights.
      float dotAlpha = dotMaskTriplanarWorld(vWorldPos, vNormal, spacingWorld, radiusPx, seed);

      ${outVar}.rgb = vec3(.35, .86, .96);
      ${outVar}.a   = dotAlpha * 10.;
    }
      `
    );

    mat.userData.shader = shader;
  };

  mat.needsUpdate = true;
  return mat;
}

