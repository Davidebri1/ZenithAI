import Synthesis from "./Synthesis";

const SCALE = 1290 / 390;

export default function HD_Synthesis() {
  return (
    <div style={{ width: 1290, height: 2796, background: "#07071a", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "top left", transform: `scale(${SCALE})` }}>
        <Synthesis />
      </div>
    </div>
  );
}
