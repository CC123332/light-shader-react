// ThreeApp.jsx
import { useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";

import SceneContent from "./SceneContent.jsx";
import Annotation from "./Annotation.jsx";
import Lights from "./Lights.jsx";
import PostFX from "./PostFX.jsx";

export default function ThreeApp() {
  const dirLightRef = useRef();
  const [shaderType, setShaderType] = useState("dot");

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        shadows
        camera={{ fov: 60, near: 0.1, far: 100, position: [-2, 4, 6] }}
        gl={{ antialias: true }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 1.0);

          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFShadowMap;

          camera.lookAt(-2, 3, 0);
          camera.updateProjectionMatrix();
        }}
      >
        <color attach="background" args={[0x101018]} />

        <Lights dirLightRef={dirLightRef} />

        <SceneContent dirLightRef={dirLightRef} shaderType={shaderType}/>

        <Annotation position={[1.2, 4.8, -.2]} rotation={[0, -Math.PI / 4, 0]} clickFunction={() => setShaderType("dot")}>
          <div style={{background:shaderType === "dot" ? "#F65959" : "#6A6A6A", width:'140px', height:'60px', display:'flex', alignItems:'end', justifyContent:'center', borderRadius:'8px'}}>
            <img src="/img/dotted_shader.png" alt="Dot Shadow Shader" style={{width: shaderType === "dot" ? '70px' : '50px'}} />
            <img src="/img/dotted_shader_text.png" alt="Dot Shadow Shader" style={{width:'80px', marginBottom:'10px'}} />
          </div>
        </Annotation>

        <Annotation position={[1.2, 3., -.1]} rotation={[0, -Math.PI / 4, 0]} clickFunction={() => setShaderType("dashedLine")}>
          <div style={{background:shaderType === "dashedLine" ? "#F65959" : "#6A6A6A", width:'140px', height:'60px', display:'flex', alignItems:'end', justifyContent:'center', borderRadius:'8px'}}>
            <img src="/img/dashed_line_shader.png" alt="Dot Shadow Shader" style={{width: shaderType === "dashedLine" ? '70px' : '50px'}} />
            <img src="/img/dashed_line_shader_text.png" alt="Dot Shadow Shader" style={{width:'80px', marginBottom:'10px'}} />
          </div>
        </Annotation>

        <Annotation position={[1.2, 1.2, 0]} rotation={[0, -Math.PI / 4, 0]} clickFunction={() => setShaderType("waterColor")}>
          <div style={{background:shaderType === "waterColor" ? "#F65959" : "#6A6A6A", width:'140px', height:'60px', display:'flex', alignItems:'end', justifyContent:'center', borderRadius:'8px'}}>
            <img src="/img/water_color_shader.png" alt="Dot Shadow Shader" style={{width: shaderType === "waterColor" ? '70px' : '50px'}} />
            <img src="/img/water_color_shader_text.png" alt="Dot Shadow Shader" style={{width:'80px', marginBottom:'10px'}} />
          </div>
        </Annotation>

        {shaderType === "waterColor" && <PostFX />}
      </Canvas>
    </div>
  );
}
