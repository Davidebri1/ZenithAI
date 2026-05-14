import Thread from "./Thread";

const SCALE = 1290 / 390;

export default function HD_Thread() {
  return (
    <div style={{ width: 1290, height: 2796, background: "#07071a", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "top left", transform: `scale(${SCALE})` }}>
        <Thread />
      </div>
    </div>
  );
}
