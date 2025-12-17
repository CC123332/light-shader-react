import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, Effect } from "postprocessing";
import GUI from "lil-gui";
import { setupSceneContent } from "./scene";
import { extend } from "@react-three/fiber";
import { Pass } from "postprocessing";

export default function ThreeApp() {

class KuwaharaEffect extends Effect {
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


  const kuwaharaShader = {
    uniforms: {
      inputBuffer: { value: null },
      resolution: {
        value: new THREE.Vector4(),
      },
      radius: { value: 100.0 },
    },
    vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    

      // Set the final position of the vertex
      gl_Position = projectionMatrix * modelViewPosition;
    }
    `,
    fragmentShader: `
      #define SECTOR_COUNT 8

      uniform float radius;
      uniform sampler2D inputBuffer;
      uniform vec4 resolution;
      uniform sampler2D originalTexture;

      varying vec2 vUv;

      vec3 sampleColor(vec2 offset) {
          vec2 coord = (gl_FragCoord.xy + offset) / resolution.xy;
          return texture2D(inputBuffer, coord).rgb;
      }

      void getSectorVarianceAndAverageColor(float angle, float radius, out vec3 avgColor, out float variance) {
          vec3 colorSum = vec3(0.0);
          vec3 squaredColorSum = vec3(0.0);
          float sampleCount = 0.0;

          for (float r = 1.0; r <= radius; r += 1.0) {
              for (float a = -0.392699; a <= 0.392699; a += 0.196349) {
                  vec2 sampleOffset = r * vec2(cos(angle + a), sin(angle + a));
                  vec3 color = sampleColor(sampleOffset);
                  colorSum += color;
                  squaredColorSum += color * color;
                  sampleCount += 1.0;
              }
          }

          // Calculate average color and variance
          avgColor = colorSum / sampleCount;
          vec3 varianceRes = (squaredColorSum / sampleCount) - (avgColor * avgColor);
          variance = dot(varianceRes, vec3(0.299, 0.587, 0.114)); // Convert to luminance
      }

      void main() {
          vec3 sectorAvgColors[SECTOR_COUNT];
          float sectorVariances[SECTOR_COUNT];

          for (int i = 0; i < SECTOR_COUNT; i++) {
            float angle = float(i) * 6.28318 / float(SECTOR_COUNT); // 2π / SECTOR_COUNT
            getSectorVarianceAndAverageColor(angle, float(radius), sectorAvgColors[i], sectorVariances[i]);
          }

          float minVariance = sectorVariances[0];
          vec3 finalColor = sectorAvgColors[0];

          for (int i = 1; i < SECTOR_COUNT; i++) {
              if (sectorVariances[i] < minVariance) {
                  minVariance = sectorVariances[i];
                  finalColor = sectorAvgColors[i];
              }
          }

          gl_FragColor = vec4(finalColor, 1.0);
      }`,
  };

  class KuwaharaPass extends Pass {
    constructor({ radius = 10 } = {}) {
      super();

      this.name = "KuwaharaPass";
      this.enabled = true;

      this.material = new THREE.ShaderMaterial({
        uniforms: {
          inputBuffer: { value: null },
          resolution: { value: new THREE.Vector4(1, 1, 1, 1) },
          radius: { value: radius },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: kuwaharaShader.fragmentShader, // reuse yours
        depthTest: false,
        depthWrite: false,
      });

      // IMPORTANT: Pass provides a full-screen quad helper
      this._fsQuad = new Pass.FullScreenQuad(this.material);

      this.radius = radius;

      this._size = new THREE.Vector2();
      this._resolution = new THREE.Vector4();
    }

    dispose() {
      this.material.dispose();
      this._fsQuad.dispose();
    }

    render(renderer, writeBuffer, readBuffer /*, deltaTime */) {
      if (!this.enabled) return;

      renderer.getDrawingBufferSize(this._size);

      // Guard against 0 size (first layout frame can be 0)
      const w = Math.max(1, this._size.x);
      const h = Math.max(1, this._size.y);

      this._resolution.set(w, h, 1 / w, 1 / h);

      this.material.uniforms.inputBuffer.value = readBuffer.texture;
      this.material.uniforms.resolution.value.copy(this._resolution);
      this.material.uniforms.radius.value = this.radius;

      // Draw full-screen
      const target = this.renderToScreen ? null : writeBuffer;
      renderer.setRenderTarget(target);
      this._fsQuad.render(renderer);
    }
  }

  extend({ KuwaharaPass });

  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 1.0);
    container.appendChild(renderer.domElement);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;

    // scene & camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101018);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(-2, 4, 6);
    const CAMERA_TARGET = new THREE.Vector3(-2, 3, 0);
    camera.lookAt(CAMERA_TARGET);
    scene.add(camera);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const kuwaharaEffect = new KuwaharaEffect({ radius: 40 });
    const kuwaharaPass = new EffectPass(camera, kuwaharaEffect);
    composer.addPass(kuwaharaPass);
    kuwaharaPass.renderToScreen = true;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x202030, 0.5);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(-6.7, 4.82, 4.82);
    dirLight.castShadow = true;

    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 20;
    dirLight.shadow.camera.left = -6;
    dirLight.shadow.camera.right = 6;
    dirLight.shadow.camera.top = 6;
    dirLight.shadow.camera.bottom = -6;

    // IMPORTANT: add target to scene so direction controls work
    scene.add(dirLight.target);
    scene.add(dirLight);

    // Helpers
    const helperParams = {
      showDirLightHelper: true,
      showShadowFrustum: true,
    };

    const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 1.0);
    scene.add(dirLightHelper);

    const dirLightShadowHelper = new THREE.CameraHelper(dirLight.shadow.camera);
    scene.add(dirLightShadowHelper);

    dirLightHelper.visible = helperParams.showDirLightHelper;
    dirLightShadowHelper.visible = helperParams.showShadowFrustum;

    // GUI
    const gui = new GUI({ title: "Lighting" });

    const dirParams = {
      color: `#${dirLight.color.getHexString()}`,
      intensity: dirLight.intensity,

      posX: dirLight.position.x,
      posY: dirLight.position.y,
      posZ: dirLight.position.z,

      targetX: dirLight.target.position.x,
      targetY: dirLight.target.position.y,
      targetZ: dirLight.target.position.z,
    };

    const dirFolder = gui.addFolder("Directional Light");

    dirFolder
      .addColor(dirParams, "color")
      .name("Color")
      .onChange((v) => dirLight.color.set(v));

    dirFolder
      .add(dirParams, "intensity", 0, 10, 0.01)
      .name("Intensity")
      .onChange((v) => (dirLight.intensity = v));

    const posFolder = dirFolder.addFolder("Position");
    posFolder.add(dirParams, "posX", -20, 20, 0.01).name("X").onChange((v) => (dirLight.position.x = v));
    posFolder.add(dirParams, "posY", -20, 20, 0.01).name("Y").onChange((v) => (dirLight.position.y = v));
    posFolder.add(dirParams, "posZ", -20, 20, 0.01).name("Z").onChange((v) => (dirLight.position.z = v));

    const dirTargetFolder = dirFolder.addFolder("Direction (Target)");
    dirTargetFolder.add(dirParams, "targetX", -20, 20, 0.01).name("Target X").onChange((v) => {
      dirLight.target.position.x = v;
      dirLight.target.updateMatrixWorld();
    });
    dirTargetFolder.add(dirParams, "targetY", -20, 20, 0.01).name("Target Y").onChange((v) => {
      dirLight.target.position.y = v;
      dirLight.target.updateMatrixWorld();
    });
    dirTargetFolder.add(dirParams, "targetZ", -20, 20, 0.01).name("Target Z").onChange((v) => {
      dirLight.target.position.z = v;
      dirLight.target.updateMatrixWorld();
    });

    const helpersFolder = dirFolder.addFolder("Helpers");
    helpersFolder.add(helperParams, "showDirLightHelper").name("DirectionalLightHelper").onChange((v) => (dirLightHelper.visible = v));
    helpersFolder.add(helperParams, "showShadowFrustum").name("Shadow Frustum").onChange((v) => (dirLightShadowHelper.visible = v));

    const camParams = {
      posX: camera.position.x,
      posY: camera.position.y,
      posZ: camera.position.z,
      fov: camera.fov,
    };

    const camFolder = gui.addFolder("Camera");
    const camPosFolder = camFolder.addFolder("Position");

    camPosFolder.add(camParams, "posX", -50, 50, 0.01).name("X").onChange((v) => (camera.position.x = v));
    camPosFolder.add(camParams, "posY", -50, 50, 0.01).name("Y").onChange((v) => (camera.position.y = v));
    camPosFolder.add(camParams, "posZ", -50, 50, 0.01).name("Z").onChange((v) => (camera.position.z = v));

    camFolder
      .add(camParams, "fov", 20, 100, 0.1)
      .name("FOV")
      .onChange((v) => {
        camera.fov = v;
        camera.updateProjectionMatrix();
      });

    dirFolder.close();
    posFolder.close();
    dirTargetFolder.close();
    camFolder.close();
    camPosFolder.close();
    helpersFolder.close();

    // scene content
    const sceneState = setupSceneContent({
      scene,
      camera,
      renderer,
      lights: { dirLight, hemiLight },
    });

    let lastTime = performance.now();
    let rafId = 0;

    function animate(now) {
      const dt = (now - lastTime) / 1000.0;
      lastTime = now;

      if (sceneState && typeof sceneState.update === "function") {
        sceneState.update(dt, now / 1000.0);
      }

      composer.render(dt);
      rafId = requestAnimationFrame(animate);
    }


    rafId = requestAnimationFrame(animate);

    // resize (use container size, not window)
    const onResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      composer.setSize(width, height);
    };


    window.addEventListener("resize", onResize);

    // cleanup (critical in React)
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);

      gui.destroy();

      scene.remove(dirLightHelper);
      scene.remove(dirLightShadowHelper);
      dirLightHelper.dispose?.();
      dirLightShadowHelper.dispose?.();

      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
}
