// ThreeApp.jsx
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";

import SceneContent from "./SceneContent.jsx";
import Annotation from "./Annotation.jsx";
import Lights from "./Lights.jsx";
import PostFX from "./PostFX.jsx";

// Panels (add these files below)
import DirectionalLightPanel from "./DirectionalLightPanel.jsx";
import CameraPanel from "./CameraPanel.jsx";

function CameraRig({ cameraSettings }) {
  const { camera } = useThree();

  useEffect(() => {
    const s = cameraSettings;

    if (typeof s.fov === "number") camera.fov = s.fov;
    if (typeof s.near === "number") camera.near = s.near;
    if (typeof s.far === "number") camera.far = s.far;

    if (s.position?.length === 3) camera.position.set(...s.position);
    if (s.lookAt?.length === 3) camera.lookAt(...s.lookAt);

    camera.updateProjectionMatrix();
  }, [camera, cameraSettings]);

  return null;
}

export default function ThreeApp() {
  const dirLightRef = useRef();
  const [shaderType, setShaderType] = useState("dot");

  // ------------------ DEFAULT SETTINGS ------------------
  const [lightSettings, setLightSettings] = useState(() => ({
    hemisphere: {
      skyColor: 0xffffff,
      groundColor: 0x303040,
      intensity: 0.6,
    },
    directional: {
      color: 0xfff7e8,
      intensity: 10,
      position: [-6.4, 4.82, 1.12],
      castShadow: true,
      shadow: {
        mapSize: [2048, 2048],
        camera: {
          near: 0.1,
          far: 30,
          left: -20,
          right: 20,
          top: 20,
          bottom: -20,
        },
        bias: -0.0002,
        normalBias: 0.02,
      },
    },
  }));

  const [cameraSettings, setCameraSettings] = useState(() => ({
    fov: 60,
    near: 0.1,
    far: 100,
    position: [-2, 4, 6],
    lookAt: [-2, 3, 0],
  }));
  // ------------------------------------------------------

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        shadows
        camera={{
          fov: cameraSettings.fov,
          near: cameraSettings.near,
          far: cameraSettings.far,
          position: cameraSettings.position,
        }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 1.0);
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFShadowMap;
        }}
      >
        <color attach="background" args={[0x101018]} />

        {/* Camera updates live from the panel */}
        <CameraRig cameraSettings={cameraSettings} />

        {/* Lights update live from the panel */}
        <Lights
          dirLightRef={dirLightRef}
          hemisphere={lightSettings.hemisphere}
          directional={lightSettings.directional}
            debug={{
              enabled: true,
              dirLight: true,        // show DirectionalLightHelper
              shadowCamera: true,    // show CameraHelper for shadow frustum
              helperSize: 1.2,
              helperColor: "cyan",
            }}
        />

        <SceneContent dirLightRef={dirLightRef} shaderType={shaderType} />

        {/* Shader selector annotations (unchanged) */}
        <Annotation
          position={[1.2, 4.8, -0.2]}
          rotation={[0, -Math.PI / 4, 0]}
          clickFunction={() => setShaderType("dot")}
        >
          <div
            style={{
              background: shaderType === "dot" ? "#F65959" : "#6A6A6A",
              width: "140px",
              height: "60px",
              display: "flex",
              alignItems: "end",
              justifyContent: "center",
              borderRadius: "8px",
            }}
          >
            <img
              className={shaderType === "dot" ? "shadowed-img" : ""}
              src="/img/dotted_shader.png"
              alt="Dot Shadow Shader"
              style={{ width: shaderType === "dot" ? "70px" : "50px" }}
            />
            <img
              src="/img/dotted_shader_text.png"
              alt="Dot Shadow Shader"
              style={{ width: "80px", marginBottom: "10px" }}
            />
          </div>
        </Annotation>

        <Annotation
          position={[1.2, 3.0, -0.1]}
          rotation={[0, -Math.PI / 4, 0]}
          clickFunction={() => setShaderType("dashedLine")}
        >
          <div
            style={{
              background: shaderType === "dashedLine" ? "#F65959" : "#6A6A6A",
              width: "140px",
              height: "60px",
              display: "flex",
              alignItems: "end",
              justifyContent: "center",
              borderRadius: "8px",
            }}
          >
            <img
              className={shaderType === "dashedLine" ? "shadowed-img" : ""}
              src="/img/dashed_line_shader.png"
              alt="Dashed Line Shader"
              style={{ width: shaderType === "dashedLine" ? "70px" : "50px" }}
            />
            <img
              src="/img/dashed_line_shader_text.png"
              alt="Dashed Line Shader"
              style={{ width: "80px", marginBottom: "10px" }}
            />
          </div>
        </Annotation>

        <Annotation
          position={[1.2, 1.2, 0]}
          rotation={[0, -Math.PI / 4, 0]}
          clickFunction={() => setShaderType("waterColor")}
        >
          <div
            style={{
              background: shaderType === "waterColor" ? "#F65959" : "#6A6A6A",
              width: "140px",
              height: "60px",
              display: "flex",
              alignItems: "end",
              justifyContent: "center",
              borderRadius: "8px",
            }}
          >
            <img
              className={shaderType === "waterColor" ? "shadowed-img" : ""}
              src="/img/water_color_shader.png"
              alt="Water Color Shader"
              style={{ width: shaderType === "waterColor" ? "70px" : "50px" }}
            />
            <img
              src="/img/water_color_shader_text.png"
              alt="Water Color Shader"
              style={{ width: "80px", marginBottom: "10px" }}
            />
          </div>
        </Annotation>

        {/* ---------------- SETTINGS PANELS ---------------- */}

        {/* Directional light panel */}
        <Annotation position={[-8, 3.5, -6]} rotation={[0, Math.PI / 6, 0]}>
          <DirectionalLightPanel
            value={lightSettings.directional}
            onChange={(nextDirectional) =>
              setLightSettings((prev) => ({ ...prev, directional: nextDirectional }))
            }
          />
        </Annotation>

        {/* Camera panel */}
        {/* <Annotation position={[-5, 2.6, 0]} rotation={[0, Math.PI / 6, 0]}>
          <CameraPanel
            value={cameraSettings}
            onChange={(nextCamera) => setCameraSettings(nextCamera)}
          />
        </Annotation> */}

        {/* ------------------------------------------------- */}

        {shaderType === "waterColor" && <PostFX />}
      </Canvas>
    </div>
  );
}
