// lights.js
import * as THREE from "three";
import GUI from "lil-gui";

/**
 * Creates hemisphere + directional lights, helpers, and a GUI folder to control them.
 *
 * @param {object} args
 * @param {THREE.Scene} args.scene
 * @param {GUI} args.gui - A shared lil-gui instance created by the caller.
 */
export function setupLights({ scene, gui }) {
  // --- Lights ---
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x202030, 0.5);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(-6.7, 4.82, 4.82);
  dirLight.intensity = 8.0;
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

  // --- Helpers ---
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

  // --- GUI ---
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
  posFolder
    .add(dirParams, "posX", -20, 20, 0.01)
    .name("X")
    .onChange((v) => (dirLight.position.x = v));
  posFolder
    .add(dirParams, "posY", -20, 20, 0.01)
    .name("Y")
    .onChange((v) => (dirLight.position.y = v));
  posFolder
    .add(dirParams, "posZ", -20, 20, 0.01)
    .name("Z")
    .onChange((v) => (dirLight.position.z = v));

  const dirTargetFolder = dirFolder.addFolder("Direction (Target)");
  dirTargetFolder
    .add(dirParams, "targetX", -20, 20, 0.01)
    .name("Target X")
    .onChange((v) => {
      dirLight.target.position.x = v;
      dirLight.target.updateMatrixWorld();
    });
  dirTargetFolder
    .add(dirParams, "targetY", -20, 20, 0.01)
    .name("Target Y")
    .onChange((v) => {
      dirLight.target.position.y = v;
      dirLight.target.updateMatrixWorld();
    });
  dirTargetFolder
    .add(dirParams, "targetZ", -20, 20, 0.01)
    .name("Target Z")
    .onChange((v) => {
      dirLight.target.position.z = v;
      dirLight.target.updateMatrixWorld();
    });

  const helpersFolder = dirFolder.addFolder("Helpers");
  helpersFolder
    .add(helperParams, "showDirLightHelper")
    .name("DirectionalLightHelper")
    .onChange((v) => (dirLightHelper.visible = v));
  helpersFolder
    .add(helperParams, "showShadowFrustum")
    .name("Shadow Frustum")
    .onChange((v) => (dirLightShadowHelper.visible = v));

  // Match your existing initial UI state
  dirFolder.close();
  posFolder.close();
  dirTargetFolder.close();
  helpersFolder.close();

  // Return handles + a cleanup function
  function cleanup() {
    scene.remove(dirLightHelper);
    scene.remove(dirLightShadowHelper);
    dirLightHelper.dispose?.();
    dirLightShadowHelper.dispose?.();

    // NOTE: we are not removing the actual lights here because the caller may
    // want them to remain for any late cleanup logic; feel free to remove if desired.
    // scene.remove(dirLight);
    // scene.remove(dirLight.target);
    // scene.remove(hemiLight);
  }

  return {
    lights: { dirLight, hemiLight },
    helpers: { dirLightHelper, dirLightShadowHelper },
    cleanup,
  };
}
