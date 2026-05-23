import { deinit, initGalleryScene } from "./art.js";

export const init = async model => initGalleryScene(model, {
   enableAuditoryTraces: true,
   showTraceBubbles: true,
});

export { deinit };
