// CameraPanel.jsx
function NumberField({ label, value, step = 0.1, onChange, min, max }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "8px", alignItems: "center" }}>
      <span style={{ fontSize: "12px" }}>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: "90px",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid rgba(0,0,0,0.25)",
          background: "rgba(255,255,255,0.95)",
        }}
      />
    </label>
  );
}

function Vec3Editor({ label, value, step = 0.1, onChange }) {
  const v = value ?? [0, 0, 0];
  return (
    <div style={{ display: "grid", gap: "6px" }}>
      <div style={{ fontSize: "12px" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
        {["x", "y", "z"].map((axis, i) => (
          <input
            key={axis}
            type="number"
            step={step}
            value={v[i]}
            onChange={(e) => {
              const next = [...v];
              next[i] = parseFloat(e.target.value);
              onChange(next);
            }}
            style={{
              padding: "6px 8px",
              borderRadius: "6px",
              border: "1px solid rgba(0,0,0,0.25)",
              background: "rgba(255,255,255,0.95)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function CameraPanel({ value, onChange }) {
  const cam = value ?? {};

  const fov = cam.fov ?? 60;
  const near = cam.near ?? 0.1;
  const far = cam.far ?? 100;

  const position = Array.isArray(cam.position) ? cam.position : [-2, 4, 6];
  const lookAt = Array.isArray(cam.lookAt) ? cam.lookAt : [-2, 3, 0];

  function patch(p) {
    onChange({ ...cam, ...p });
  }

  return (
    <div
      style={{
        width: "160px",
        padding: "10px",
        height: "30px",
        overflowY:"scroll",
        borderRadius: "10px",
        background: "rgba(217,217,217,0.95)",
        color: "black",
        boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
        Camera Settings
      </div>

      <div style={{ display: "grid", gap: "10px" }}>
        <NumberField label="FOV" value={fov} step={1} min={10} max={120} onChange={(v) => patch({ fov: v })} />
        <NumberField label="Near" value={near} step={0.01} min={0.01} onChange={(v) => patch({ near: v })} />
        <NumberField label="Far" value={far} step={1} min={1} onChange={(v) => patch({ far: v })} />

        <Vec3Editor label="Position (x, y, z)" value={position} step={0.1} onChange={(v) => patch({ position: v })} />
        <Vec3Editor label="LookAt (x, y, z)" value={lookAt} step={0.1} onChange={(v) => patch({ lookAt: v })} />
      </div>
    </div>
  );
}
