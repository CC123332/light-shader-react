// Lights.jsx
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useHelper } from "@react-three/drei";

export default function Lights({
  dirLightRef,
  hemisphere,
  directional,
  debug, // { enabled?: boolean, dirLight?: boolean, shadowCamera?: boolean, helperSize?: number, helperColor?: any }
}) {
  const dir = directional ?? {};
  const shadow = dir.shadow ?? {};
  const cam = shadow.camera ?? {};
  const mapSize = shadow.mapSize ?? [1024, 1024];

  const dbg = debug ?? {};
  const debugEnabled = dbg.enabled ?? false;
  const showDirHelper = debugEnabled && (dbg.dirLight ?? true);
  const showShadowCamHelper = debugEnabled && (dbg.shadowCamera ?? false);
  const helperSize = dbg.helperSize ?? 1;
  const helperColor = dbg.helperColor ?? "hotpink"; // any THREE.ColorRepresentation

  // Ensure color is acceptable for R3F (hex number is fine; so is string)
  const dirColor = useMemo(() => {
    const c = dir.color ?? 0xffffff;
    return c;
  }, [dir.color]);

  // DirectionalLight visualization helper
  useHelper(
    showDirHelper ? dirLightRef : null,
    THREE.DirectionalLightHelper,
    helperSize,
    helperColor
  );

  // Shadow camera (frustum) helper
  // Note: useHelper expects a ref-like object, so we pass an object with `current`
  useHelper(
    showShadowCamHelper
      ? { current: dirLightRef?.current?.shadow?.camera }
      : null,
    THREE.CameraHelper
  );

  // After camera/frustum changes, update shadow camera matrices
  useEffect(() => {
    const l = dirLightRef?.current;
    if (!l || !l.shadow?.camera) return;

    l.shadow.camera.updateProjectionMatrix();
    l.shadow.camera.updateMatrixWorld();

    l.shadow.needsUpdate = true;
  }, [
    dirLightRef,
    cam.near, cam.far, cam.left, cam.right, cam.top, cam.bottom,
    shadow.bias, shadow.normalBias,
    mapSize?.[0], mapSize?.[1],
  ]);

  return (
    <>
      <hemisphereLight
        color={hemisphere?.skyColor ?? 0xffffff}
        groundColor={hemisphere?.groundColor ?? 0x303040}
        intensity={hemisphere?.intensity ?? 0.6}
      />

      <directionalLight
        ref={dirLightRef}
        color={dirColor}
        intensity={dir.intensity ?? 1}
        position={dir.position ?? [0, 5, 0]}
        castShadow={dir.castShadow ?? true}
        shadow-mapSize={mapSize}
        shadow-bias={shadow.bias ?? -0.0002}
        shadow-normalBias={shadow.normalBias ?? 0.02}
        shadow-camera-near={cam.near ?? 0.1}
        shadow-camera-far={cam.far ?? 30}
        shadow-camera-left={cam.left ?? -8}
        shadow-camera-right={cam.right ?? 8}
        shadow-camera-top={cam.top ?? 8}
        shadow-camera-bottom={cam.bottom ?? -8}
      />
    </>
  );
}
