import { Html } from "@react-three/drei";

export default function Annotation({ children, clickFunction, ...props }) {
  return (
    <Html {...props} transform occlude>
      <div className="annotation" onClick={clickFunction}>
        {children}
      </div>
    </Html>
  );
}
