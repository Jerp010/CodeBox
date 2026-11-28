import "./style.css"; // Tailwind + the three fonts
import { mountLobby } from "../../games/typebyte/host/lobby.js";

mountLobby(document.querySelector("#app"));
