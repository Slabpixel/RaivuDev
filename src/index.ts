/*
  Rive (JS) - Responsive Layouts
  Resources: 
  - Rive source file: https://rive.app/community/files/24638-46038-layouts-demo
  - Building Layouts in Rive: https://rive.app/docs/editor/layouts/layouts-overview
  - Layouts at runtime: https://rive.app/docs/runtimes/layout#web
*/

import "./styles.css";
import Lenis from 'lenis';
import { RiveManager } from "./managers/RiveManager";
import { ScrollManager } from "./managers/ScrollManager";
import { initLazyVideos } from "./utils/LazyLoader";

// Initialize Lenis for smooth scrolling
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  smoothWheel: true,
  infinite: false,
});

// Initialize Managers
const riveManager = new RiveManager();
const scrollManager = new ScrollManager();

// Setup Interactions
scrollManager.setupLenis(lenis);

// Rive Initializations
riveManager.initHeroAnimations();
riveManager.initLazyAnimations(lenis);

// Lazy Load Videos
initLazyVideos();


// Loading Overlay Logic
const MINIMUM_LOADING_TIME = 1000; // 1 second
const startTime = Date.now();
const loadingOverlay = document.getElementById("loading-overlay");
const loadingCanvas = document.getElementById("loading-canvas") as HTMLCanvasElement;

// Create a simple eager Rive instance for the loader if needed, 
// OR simpler: just use what was there but clean it up.
// The original code imported Rive here. We can use RiveManager or just inline it for the loader
// since the loader needs to be immediate.
import { Rive } from "@rive-app/webgl2";

let loadingInstance: Rive | null = null;
if (loadingCanvas) {
  loadingInstance = new Rive({
    src: new URL("./assets/rive/loading3.riv", import.meta.url).toString(),
    canvas: loadingCanvas,
    artboard: "Artboard",
    autoplay: true,
    useOffscreenRenderer: true,
    onLoad: () => {
      loadingInstance?.resizeDrawingSurfaceToCanvas();
    },
  });
}

function hideLoader() {
  const elapsedTime = Date.now() - startTime;
  const remainingTime = Math.max(0, MINIMUM_LOADING_TIME - elapsedTime);

  setTimeout(() => {
    if (loadingOverlay && !loadingOverlay.classList.contains("hidden")) {
      loadingOverlay.classList.add("hidden");
      // Cleanup loading instance after fade transition
      setTimeout(() => {
        loadingInstance?.cleanup();
        loadingInstance = null;
      }, 500); // Wait for transition
    }
  }, remainingTime);
}

// Ensure loader is hidden when everything is ready (or fallback)
window.addEventListener("load", () => {
  hideLoader();
});
