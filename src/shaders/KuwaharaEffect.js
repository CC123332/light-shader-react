import * as THREE from "three";
import { Effect } from "postprocessing";

export class KuwaharaEffect extends Effect {
    constructor({ radius = 10 } = {}) {
      super("KuwaharaEffect", /* fragment */ `
        #define SECTOR_COUNT 8

        uniform float radius;
        uniform vec4 resolution;

        vec3 sampleColor(vec2 fragCoord, vec2 offset) {
          vec2 coord = (fragCoord + offset) / resolution.xy;
          return texture2D(inputBuffer, coord).rgb;
        }

        void getSectorVarianceAndAverageColor(vec2 fragCoord, float angle, float rad, out vec3 avgColor, out float variance) {
          vec3 colorSum = vec3(0.0);
          vec3 squaredColorSum = vec3(0.0);
          float sampleCount = 0.0;

          for (float r = 1.0; r <= rad; r += 1.0) {
            for (float a = -0.392699; a <= 0.392699; a += 0.196349) {
              vec2 sampleOffset = r * vec2(cos(angle + a), sin(angle + a));
              vec3 c = sampleColor(fragCoord, sampleOffset);
              colorSum += c;
              squaredColorSum += c * c;
              sampleCount += 1.0;
            }
          }

          avgColor = colorSum / sampleCount;
          vec3 varVec = (squaredColorSum / sampleCount) - (avgColor * avgColor);
          variance = dot(varVec, vec3(0.299, 0.587, 0.114));
        }

        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          // pixel coords
          vec2 fragCoord = uv * resolution.xy;

          vec3 sectorAvg[SECTOR_COUNT];
          float sectorVar[SECTOR_COUNT];

          for (int i = 0; i < SECTOR_COUNT; i++) {
            float angle = float(i) * 6.28318 / float(SECTOR_COUNT);
            getSectorVarianceAndAverageColor(fragCoord, angle, radius, sectorAvg[i], sectorVar[i]);
          }

          float minV = sectorVar[0];
          vec3 finalC = sectorAvg[0];

          for (int i = 1; i < SECTOR_COUNT; i++) {
            if (sectorVar[i] < minV) {
              minV = sectorVar[i];
              finalC = sectorAvg[i];
            }
          }

          outputColor = vec4(finalC, 1.0);
        }
      `, {
        uniforms: new Map([
          ["radius", new THREE.Uniform(radius)],
          ["resolution", new THREE.Uniform(new THREE.Vector4(1, 1, 1, 1))],
        ]),
      });

      this._size = new THREE.Vector2();
      this._resolution = new THREE.Vector4();
    }

    setRadius(v) {
      this.uniforms.get("radius").value = v;
    }

    update(renderer) {
      // Keep resolution current (pixel size, incl DPR)
      renderer.getDrawingBufferSize(this._size);
      const w = Math.max(1, this._size.x);
      const h = Math.max(1, this._size.y);
      this._resolution.set(w, h, 1 / w, 1 / h);
      this.uniforms.get("resolution").value.copy(this._resolution);
    }
  }