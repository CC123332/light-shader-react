// DirectionalLightPanel.jsx
import { useMemo } from "react";

function safeParseFloat(s) {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null; // null means “ignore this change”
}

function clampNumber(n, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

function toHex6(intColor) {
  const n = (intColor ?? 0xffffff) >>> 0;
  return `#${n.toString(16).padStart(6, "0")}`;
}

function fromHex6(hex) {
  const clean = (hex || "").replace("#", "");
  if (clean.length !== 6) return 0xffffff;
  const v = parseInt(clean, 16);
  return Number.isFinite(v) ? v : 0xffffff;
}

function NumberField({ label, value, step = 0.1, onChange, min, max }) {
  return (
    <div
      style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}
    >
      <span style={{ fontSize: "12px" }}>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const n = safeParseFloat(e.target.value);
          if (n === null) return; // don’t write NaN into state while user is typing
          onChange(n);
        }}
        style={{
          width: "100px",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid rgba(0,0,0,0.25)",
          background: "rgba(255,255,255,0.95)",
          color: "#000",
        }}
      />
    </div>
  );
}


function Vec3Editor({ label, value, step = 0.1, onChange }) {
  const v = Array.isArray(value) && value.length === 3 ? value : [0, 0, 0];

  return (
    <div style={{ display: "grid", gap: "6px" }}>
      <div style={{ fontSize: "12px" }}>{label}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {["x", "y", "z"].map((axis, i) => (
          <input
            key={axis}
            type="number"
            step={step}
            value={Number.isFinite(v[i]) ? v[i] : ""}
            onChange={(e) => {
              const n = safeParseFloat(e.target.value);
              if (n === null) return;
              const next = [...v];
              next[i] = n;
              onChange(next);
            }}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: "6px",
              border: "1px solid rgba(0,0,0,0.25)",
              background: "rgba(255,255,255,0.95)",
              color: "#000",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function DirectionalLightPanel({ value, onChange }) {
  const dir = value ?? {};
  const shadow = dir.shadow ?? {};
  const shadowCam = shadow.camera ?? {};

  const ui = useMemo(() => {
    return {
      intensity: clampNumber(dir.intensity, 10),
      position: Array.isArray(dir.position) ? dir.position : [-8, 6, 5],
      colorHex: toHex6(dir.color ?? 0xfff7e8),
      near: clampNumber(shadowCam.near, 0.1),
      far: clampNumber(shadowCam.far, 30),
      left: clampNumber(shadowCam.left, -8),
      right: clampNumber(shadowCam.right, 8),
      top: clampNumber(shadowCam.top, 8),
      bottom: clampNumber(shadowCam.bottom, -8),
      bias: clampNumber(shadow.bias, -0.0002),
      normalBias: clampNumber(shadow.normalBias, 0.02),
    };
  }, [dir, shadow, shadowCam]);

  function patch(p) {
    onChange({
      ...dir,
      ...p,
      shadow: {
        ...shadow,
        ...(p.shadow || {}),
        camera: {
          ...shadowCam,
          ...((p.shadow && p.shadow.camera) || {}),
        },
      },
    });
  }

  return (
    <div
      style={{
        width: "300px",
        height: "300px",
        overflowY:"scroll",
        padding: "10px",
        borderRadius: "10px",
        background: "#D9D9D9",
        color: "black",
        boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        pointerEvents: "auto",
        fontSize: "13px",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
        Directional Light Settings
      </div>

      <div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <span style={{ fontSize: "12px", marginRight: "8px" }}>Light Color</span>
            <input
                type="color"
                value={ui.colorHex}
                onChange={(e) => patch({ color: fromHex6(e.target.value) })}
                style={{ width: "100px", height: "32px", padding: 0, border: "none", background: "none" }}
            />
        </div>


        <NumberField
          label="Intensity"
          value={ui.intensity}
          step={0.5}
          onChange={(v) => patch({ intensity: v })}
        />

        <Vec3Editor
          label="Position (x, y, z)"
          value={ui.position}
          step={0.1}
          onChange={(v) => patch({ position: v })}
        />

        <div style={{ height: "1px", background: "rgba(0,0,0,0.15)" }} />

        <div style={{ fontWeight: 600, fontSize: "12px" }}>Shadow Camera</div>

        <NumberField label="Near" value={ui.near} step={0.1} onChange={(v) => patch({ shadow: { camera: { near: v } } })} />
        <NumberField label="Far" value={ui.far} step={0.5} onChange={(v) => patch({ shadow: { camera: { far: v } } })} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <NumberField label="Left" value={ui.left} step={0.5} onChange={(v) => patch({ shadow: { camera: { left: v } } })} />
          <NumberField label="Right" value={ui.right} step={0.5} onChange={(v) => patch({ shadow: { camera: { right: v } } })} />
          <NumberField label="Top" value={ui.top} step={0.5} onChange={(v) => patch({ shadow: { camera: { top: v } } })} />
          <NumberField label="Bottom" value={ui.bottom} step={0.5} onChange={(v) => patch({ shadow: { camera: { bottom: v } } })} />
        </div>

        <div style={{ height: "1px", background: "rgba(0,0,0,0.15)" }} />

        <div style={{ fontWeight: 600, fontSize: "12px" }}>Shadow Bias</div>
        <NumberField label="bias" value={ui.bias} step={0.0001} onChange={(v) => patch({ shadow: { bias: v } })} />
        <NumberField label="normalBias" value={ui.normalBias} step={0.01} onChange={(v) => patch({ shadow: { normalBias: v } })} />
      </div>
    </div>
  );
}
