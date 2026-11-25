import "./style.css";
import "./styles/main-menu.css";
import "./styles/codeblock-lobby.css";
import "./styles/typebyte-lobby.css";
import "./scripts/main-menu.js";

const appCanvas = document.querySelector("#app");

function resizeAppCanvas() {
  const scale = Math.min(
    window.innerWidth / appCanvas.offsetWidth,
    window.innerHeight / appCanvas.offsetHeight,
  );
  appCanvas.style.setProperty("--canvas-scale", scale);
}

window.addEventListener("resize", resizeAppCanvas);
resizeAppCanvas();
