
export function imageLoad(image, path) {
   return new Promise((resolve, reject) => {
      image.onload = function(event) {
         resolve(image);
      }
      image.src = path;
   });
};

export function loadJSON(path, fileName, rootPath) {
   return fetch(rootPath + path + "/" + fileName)
  .then(response => response.json()).catch((err) => { console.error(err); })
}

export function TextureInfo(descriptor, parentPath) {
   this.descriptor = descriptor;
   this.parentPath = parentPath
}

export function loadIntoTextureInfo(info, proc) {
   const assets    = info.descriptor.assets;

   let out = new Promise((resolve, reject) => {
      const toLoad = [];
      for (let key in assets) {  
         const entry = assets[key];

         toLoad.push(imageLoad(new Image(), info.parentPath + "/" + entry['path']));
         toLoad[toLoad.length - 1].then((data) => {
            const record = proc(entry['path'], data);
            
            entry.width       = data.width;
            entry.height      = data.height;
            entry.resourceKey = record.key;
               
         }).catch((err) => { console.error(err); });
      }

      Promise.all(toLoad).then((result)=> {
         const sequences = info.descriptor.sequences;
         for (let sk in sequences) {
            const seq = sequences[sk];

            for (let f = 0; f < seq.frames.length; f += 1) {
               const ref   = seq.frames[f].ref;
               const frame = seq.frames[f];
               const asset = assets[ref];
               frame.asset = asset;
               frame.resourceKey = asset.resourceKey;
               
               if (frame.x == undefined) {
                  frame.x = 0;
               }
               if (frame.y == undefined) {
                  frame.y = 0;
               }
               if (frame.width == undefined) {
                  frame.width = asset.width;
               }
               if (frame.height == undefined) {
                  frame.height = asset.height;
               }

               frame.uv = [
                  frame.x / asset.width,
                  frame.y / asset.height,
                  (frame.x + frame.width) / asset.width,
                  (frame.y + frame.height) / asset.height
               ];
            }
         }
         resolve(info);
      });
   })
   return out;
}

export function loadTextureAssetFromFile(args) {
   const path     = args.path;
   const handler  = args.handler;
   const fileName = args.fileName;
   args.rootPath =  (args.rootPath != undefined) ? args.rootPath : "/media/textures/";
   const rootPath = args.rootPath;
   return loadJSON(path, fileName, rootPath)
  .then((data) => { 
      const info = new TextureInfo(data, rootPath + path);

      return loadIntoTextureInfo(info, handler);
   });
}
