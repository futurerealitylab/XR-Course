export const init = async model => {
   // Load the .xyz file as text
   const response = await fetch('../media/point_cloud/skeleton.xyz');
   const text = await response.text();

   // Parse the file into particle data
   let data = [];
   let n = 0;
   const lines = text.trim().split('\n');
   for (let line of lines) {
        n ++;
      const [x, y, z] = line.trim().split(/\s+/).map(Number);
      data.push({ s: 0.2, p: [0.01 * x, 0.01 * y + 1.6, 0.01 * z], c: [n/5000, n/5000, n/5000] });
   }

   const N = data.length;
   console.log("total data num", N)

   // Load your particle texture
   model.txtrSrc(1, '../media/textures/radial_gradient_transparent.png');

   // Create particles using parsed data
   let particles = model.add('particles').info(N).txtr(1);
   console.log("particle sample", data[120])

   // Static display (no animation needed unless you want one)
   model.animate(() => {
      particles.setParticles(data);
   });
};
