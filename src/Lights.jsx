export default function Lights({ dirLightRef }) {
  return (
    <>
      <hemisphereLight args={[0xffffff, 0x202030, 0.5]} />

      <directionalLight
        ref={dirLightRef}
        castShadow
        color={0xffffff}
        intensity={8}
        position={[-6.7, 4.82, 4.82]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
    </>
  );
}
