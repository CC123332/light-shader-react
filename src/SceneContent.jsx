// SceneContent.jsx
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

import { floorVertexShader, floorFragmentShader } from "./shaders/floorShadowTint.js";

import {
  makeDotShadowMaterial,
  makeDashedLineShadowMaterial,
  makeNoiseShadowMaterial,
} from "./shaders/shadowMaterial.js";

export default function SceneContent({ dirLightRef, shaderType }) {
  // ---------- Floor ----------
  const floorGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(20, 60);
    g.rotateX(-Math.PI / 2);
    g.rotateY(-Math.PI / 4);
    return g;
  }, []);

  const floorUniforms = useMemo(
    () => ({
      uShadowMap: { value: null }, // set after first shadow render
      uShadowMatrix: { value: new THREE.Matrix4() },
      uShadowBias: { value: 0.00005 },
      uShadowDarkness: { value: 0.75 },

      uFloorColor: { value: new THREE.Color(0x88b4ff) },
      uShadowTint: { value: new THREE.Color(0xff0000) },
    }),
    []
  );

  const floorMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: floorUniforms,
        vertexShader: floorVertexShader,
        fragmentShader: floorFragmentShader,
      }),
    [floorUniforms]
  );

  // Dispose shader resources on unmount
  useEffect(() => {
    return () => {
      floorMat.dispose();
      floorGeo.dispose();
    };
  }, [floorMat, floorGeo]);

  // ---------- FBX + Animation ----------
  const fbx = useLoader(FBXLoader, "/models/character.fbx");
  const mixerRef = useRef(null);

  useEffect(() => {
    if (!fbx) return;

    // Transform root to match your imperative setup
    fbx.scale.setScalar(0.03);
    fbx.position.set(-1, 0, 0);
    fbx.rotation.y = -Math.PI / 4;

    // Replace materials on skinned meshes
    fbx.traverse((obj) => {
      if (obj.isSkinnedMesh) {
        // const m = new THREE.MeshStandardMaterial({
        //   color: 0xffffff,
        //   roughness: 1.0,
        //   metalness: 0.0,
        //   skinning: true,
        // });

        if (shaderType === "dot") {
          const m = makeDotShadowMaterial();
          obj.material = m;
        }
        if (shaderType === "dashedLine") {
          const m = makeDashedLineShadowMaterial();
          obj.material = m;
        }
        if (shaderType === "waterColor") {
          const m = makeNoiseShadowMaterial("new", obj.material);
          obj.material = m;
        }
        // Optional: dispose old material if it exists and is safe to dispose
        // (FBX materials are often unique, but if you share materials you may omit this)
        if (obj.material && obj.material.dispose) obj.material.dispose();

        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    // Play first animation clip, if present
    if (fbx.animations && fbx.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(fbx);
      mixer.clipAction(fbx.animations[0]).play();
      mixerRef.current = mixer;

      return () => {
        mixer.stopAllAction();
        mixer.uncacheRoot(fbx);
        mixerRef.current = null;
      };
    }
  }, [fbx, shaderType]);

  // ---------- Per-frame update (shadow uniforms + animation) ----------
  useFrame((state, dt) => {
    const dirLight = dirLightRef?.current;
    if (dirLight?.shadow) {
      // shadow matrix (includes bias transform)
      floorUniforms.uShadowMatrix.value.copy(dirLight.shadow.matrix);

      // shadow map texture becomes valid after at least one shadow render
      const tex = dirLight.shadow.map?.texture ?? null;
      if (tex) floorUniforms.uShadowMap.value = tex;
    }

    if (mixerRef.current) mixerRef.current.update(dt);
  });

  return (
    <>
      {/* Floor */}
      <mesh
        geometry={floorGeo}
        material={floorMat}
        receiveShadow
        position={[20, 0, -12]}
      />

      {/* Character */}
      {fbx ? <primitive object={fbx} /> : null}
    </>
  );
}
