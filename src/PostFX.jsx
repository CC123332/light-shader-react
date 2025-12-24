import { useMemo } from "react";
import { EffectComposer } from "@react-three/postprocessing";
import { KuwaharaEffect } from "./shaders/KuwaharaEffect";

export default function PostFX() {
  const effect = useMemo(() => new KuwaharaEffect({ radius: 10 }), []);
  return (
    <EffectComposer>
      <primitive object={effect} />
    </EffectComposer>
  );
}
