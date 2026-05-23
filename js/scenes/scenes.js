export default () => {
   return {
      enableSceneReloading: true,
      scenes: [
         {
            name: "baseline",
            label: "Section A",
            path: "./baseline.js",
            public: true,
            background: "./media/gltf/gallery/scene.gltf",
         },
         {
            name: "art",
            label: "Section B",
            path: "./art.js",
            public: true,
            background: "./media/gltf/gallery/scene.gltf",
         },
         {
            name: "traceBubbles",
            label: "Setting",
            path: "./traceBubbles.js",
            public: true,
            background: "./media/gltf/gallery/scene.gltf",
         },
      ],
   };
};
