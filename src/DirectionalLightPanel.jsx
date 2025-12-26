// DirectionalLightPanel.jsx
import { useMemo } from "react";

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

function NumberField({
    label,
    value,
    step = 0.1,
    min,
    max,
    showSlider = false,
    onChange,
}) {
  const v = Number.isFinite(value) ? value : 0;

  const handleChange = (raw) => {
    // allow partial typing like "-" or "."
    if (raw === "" || raw === "-" || raw === "." || raw === "-.") return;

    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    onChange(n);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
            }}
        >
            <span style={{ fontSize: 12 }}>{label}</span>

            <input
                type="number"
                value={v}
                step={step}
                min={min}
                max={max}
                onChange={(e) => handleChange(e.target.value)}
                style={{
                    width: 60,
                    margin: "2px",
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "1px solid rgba(0,0,0,0.25)",
                    background: "rgba(255,255,255,0.95)",
                    color: "#000",
                }}
            />
        </div>

        {showSlider && (
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={v}
                onChange={(e) => handleChange(e.target.value)}
                style={{ width: "100%" }}
            />
        )}
    </div>
  );
}

function Vec3Editor({
    label,
    value,
    step = 0.1,
    min = -10,
    max = 10,
    onChange,
}) {
    const axes = ["x", "y", "z"];

    // Normalize incoming value into a clean numeric vec3
    const v = axes.map((axis, i) => {
        const raw = Array.isArray(value) ? value[i] : value?.[axis];
        const n = typeof raw === "string" ? Number(raw) : raw;
        return Number.isFinite(n) ? n : 0;
    });

    const updateAxis = (i, raw) => {
        // Allow typing "-" or "" without immediately forcing 0 (optional)
        if (raw === "" || raw === "-" || raw === "." || raw === "-.") return;

        const n = Number(raw);
        if (!Number.isFinite(n)) return;

        const next = [...v];
        next[i] = n;
        onChange(next);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12 }}>{label}</div>

            {axes.map((axis, i) => (
                <div key={axis} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, fontSize: 12 }}>{axis}</div>

                    <input
                        type="number"
                        step={step}
                        value={v[i]}
                        onChange={(e) => updateAxis(i, e.target.value)}
                        style={{
                            width: 70,
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "1px solid rgba(0,0,0,0.25)",
                            background: "rgba(255,255,255,0.95)",
                            color: "#000",
                        }}
                    />

                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={v[i]}
                        onChange={(e) => updateAxis(i, e.target.value)}
                        style={{ flex: 1 }}
                    />
                </div>
            ))}
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
                height: "260px",
                padding: "10px",
                borderRadius: "10px",
                background: "white",
                color: "black",
                boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                pointerEvents: "auto",
                fontSize: "13px"
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
                        style={{ width: "50px", height: "32px", padding: 0, border: "none", background: "none" }}
                    />
                </div>


                <NumberField
                    label="Intensity"
                    value={ui.intensity}
                    step={0.5}
                    min={0}
                    max={10}
                    showSlider
                    onChange={(v) => patch({ intensity: v })}
                />

                <Vec3Editor
                    label="Position (x, y, z)"
                    value={ui.position}
                    step={0.1}
                    onChange={(v) => patch({ position: v })}
                />
            </div>
        </div>
    );
}
