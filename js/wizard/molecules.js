let atomsInfo = {
   carbon   : { symbol: 'C', color: [.03,.03,.03], radius:  70 },
   chlorine : { symbol: 'X', color: [0,1,0]   , radius: 100 },
   fluorine : { symbol: 'F', color: [.7,.7,1] , radius:  50 },
   hydrogen : { symbol: 'H', color: [1,1,1]   , radius:  25 },
   iodine   : { symbol: 'I', color: [1,0,1]   , radius: 140 },
   nitrogen : { symbol: 'N', color: [0,0,1]   , radius:  65 },
   oxygen   : { symbol: 'O', color: [1,0,0]   , radius:  60 },
};

let moleculesInfo = {
   buckyball: {
          //   123456789 123456789 123456789 123456789 123456789 123456789
      atoms: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      positions: [
         [-1.132,-2.176, 2.423],
         [-1.619,-0.963, 2.882],
         [ 0.229,-2.435, 2.451],
         [-2.681,-0.589, 2.075],
         [-0.743,-0.004, 3.366],
         [-0.932, 1.330, 3.049],
         [ 1.104,-1.476, 2.931],
         [ 0.618,-0.260, 3.382],
         [-2.886, 0.746, 1.759],
         [-2.017, 1.700, 2.268],
         [ 1.272, 0.917, 3.056],
         [ 0.319, 1.900, 2.852],
         [-2.845,-1.571, 1.111],
         [-1.888,-2.547, 1.324],
         [ 0.524, 2.853, 1.866],
         [ 2.413, 0.879, 2.270],
         [-1.848, 2.668, 1.302],
         [ 2.248,-1.517, 2.154],
         [-0.538, 3.259, 1.085],
         [ 2.899,-0.339, 1.832],
         [-1.284,-3.172, 0.244],
         [-3.206,-1.223,-0.180],
         [-3.268, 1.098, 0.470],
         [ 0.833,-3.066, 1.379],
         [ 0.073,-3.434, 0.283],
         [-3.430, 0.108,-0.486],
         [-2.641, 2.289, 0.146],
         [ 2.079,-2.496, 1.191],
         [ 1.650, 2.806, 1.058],
         [ 2.684, 0.589,-2.083],
         [ 1.617, 0.965,-2.882],
         [ 2.881,-0.747,-1.770],
         [ 1.131, 2.175,-2.415],
         [ 0.742, 0.005,-3.366],
         [-0.619, 0.258,-3.389],
         [ 2.005,-1.705,-2.249],
         [ 0.933,-1.327,-3.043],
         [-0.230, 2.442,-2.442],
         [-1.095, 1.484,-2.950],
         [-0.314,-1.897,-2.846],
         [-1.274,-0.923,-3.062],
         [ 1.896, 2.542,-1.319],
         [ 2.851, 1.562,-1.113],
         [-2.421,-0.912,-2.281],
         [-0.494,-2.844,-1.850],
         [-2.250, 1.525,-2.200],
         [ 1.830,-2.656,-1.260],
         [-2.932, 0.292,-1.845],
         [-2.594,-1.839,-1.264],
         [ 0.583,-3.223,-1.069],
         [-1.628,-2.813,-1.051],
         [ 3.208, 1.203, 0.177],
         [ 1.302, 3.171,-0.237],
         [-0.826, 3.091,-1.368],
         [ 3.246,-1.108,-0.485],
         [ 3.411,-0.130, 0.480],
         [ 2.602, 1.817, 1.264],
         [-0.051, 3.454,-0.277],
         [-2.086, 2.547,-1.182],
         [ 2.593,-2.285,-0.167],
      ],
      links: [ [1,2,13], [0,3,4], [0,6,23], [1,8,12], [1,5,7], [4,9,11], [2,7,17], [6,4,10], [3,9,22], [5,8,16], [7,11,15], [5,10,14], [3,13,21], [0,12,20], [11,18,28], [10,19,56], [9,18,26], [6,19,27], [14,16,57], [15,17,55], [13,24,50], [12,25,48], [8,25,26], [2,24,27], [20,23,49], [21,22,47], [22,16,58], [23,17,59], [14,52,56], [30,31,42], [29,32,33], [29,35,54], [30,37,41], [30,34,36], [33,38,40], [31,36,46], [35,33,39], [32,38,53], [34,37,45], [36,40,44], [34,39,43], [32,42,52], [29,41,51], [40,47,48], [39,49,50], [38,47,58], [35,49,59], [43,45,25], [43,50,21], [44,46,24], [48,44,20], [42,55,56], [41,28,57], [37,57,58], [31,55,59], [51,54,19], [51,28,15], [52,53,18], [53,45,26], [54,46,27], ],
   },
   caffeine: {
      atoms: 'NCCCCNNNCCCCOOHHHHHHHHHH',
      positions: [
         [ 2.151, 0.147,-0.354],
         [ 1.834,-0.975, 0.234],
         [ 1.002, 0.838,-0.539],
         [-0.017, 0.065,-0.017],
         [ 3.483, 0.581,-0.729],
         [ 0.582,-1.044, 0.437],
         [-1.300, 0.478,-0.027],
         [-0.682, 2.450,-1.089],
         [-2.333,-0.368, 0.546],
         [-1.113, 3.721,-1.652],
         [ 0.598, 2.159,-1.137],
         [-1.588, 1.648,-0.557],
         [ 1.451, 2.882,-1.627],
         [-2.756, 2.006,-0.555],
         [-0.413, 4.499,-1.349],
         [-2.111, 3.954,-1.280],
         [-1.131, 3.640,-2.739],
         [-2.029,-1.410, 0.456],
         [-3.266,-0.205, 0.006],
         [-2.462,-0.107, 1.597],
         [ 3.479, 1.662,-0.864],
         [ 3.766, 0.091,-1.661],
         [ 4.181, 0.307, 0.062],
         [ 2.476,-1.787, 0.542],
      ],
      links: [ [1,2,4], [0,5,23], [0,3,10], [2,5,6], [0,20,21,22], [3,1], [8,3,11], [9,10,11], [6,17,18,19], [7,14,15,16], [2,12,7], [6,13,7], [10], [11], [9], [9], [9], [8], [8], [8], [4], [4], [4], [1], ],
   },
   ethanol: {
      atoms: 'CCHHHHHOH',
      positions: [
         [-0.017, 0.012,-0.004],
         [ 1.531, 0.003,-0.065],
         [-0.386, 1.004, 0.300],
         [-0.369,-0.737, 0.723],
         [-0.433,-0.232,-0.994],
         [ 1.938, 0.238, 0.933],
         [ 1.873, 0.780,-0.768],
         [ 1.975,-1.296,-0.496],
         [ 2.924,-1.359,-0.555],
      ],
      links: [ [1,2,3,4], [0,5,6,7], [0], [0], [0], [1], [1], [1,8], [7], ],
   },
   morphine: {
      atoms: 'NCCCCCCCCCCCCCOCOHHHHHOHHHHHHHCHHHHHCCHH',
      positions: [
         [-2.253, 1.495, 0.208],
         [-1.969, 0.720, 1.431],
         [-0.505, 0.908, 1.877],
         [ 0.447, 0.626, 0.700],
         [ 0.107, 1.501,-0.525],
         [-1.360, 1.177,-0.928],
         [ 0.314,-0.784, 0.198],
         [ 1.935, 0.553, 1.159],
         [ 1.355,-1.551, 0.681],
         [ 1.357,-2.931, 0.461],
         [ 0.320,-3.482,-0.311],
         [-0.674,-2.668,-0.879],
         [-0.643,-1.282,-0.681],
         [-1.560,-0.295,-1.400],
         [ 2.281,-0.895, 1.312],
         [ 2.840, 1.266, 0.127],
         [ 4.240, 0.860, 0.316],
         [ 2.764, 2.347, 0.317],
         [-1.312,-0.338,-2.471],
         [-2.602,-0.617,-1.262],
         [-1.463,-3.110,-1.478],
         [ 0.285,-4.553,-0.475],
         [ 2.295,-3.684, 0.960],
         [ 2.074, 1.058, 2.126],
         [-1.636, 1.839,-1.762],
         [ 0.200, 2.564,-0.253],
         [-0.355, 1.946, 2.210],
         [-0.286, 0.220, 2.707],
         [-2.625, 1.068, 2.242],
         [-2.161,-0.347, 1.243],
         [-3.685, 1.439,-0.146],
         [ 4.868, 1.314,-0.235],
         [ 2.192,-4.618, 0.821],
         [-3.836, 0.930,-1.109],
         [-4.072, 2.465,-0.226],
         [-4.250, 0.902, 0.631],
         [ 2.391, 1.029,-1.291],
         [ 1.099, 1.158,-1.607],
         [ 0.765, 1.009,-2.632],
         [ 3.117, 0.760,-2.057],
      ],
      links: [ [1,5,30], [0,2,28,29], [1,3,26,27], [2,4,6,7], [3,5,25,37], [0,4,13,24], [3,8,12], [3,14,15,23], [6,9,14], [8,10,22], [9,11,21], [10,12,20], [11,6,13], [12,5,18,19], [7,8], [7,16,17,36], [15,31], [15], [13], [13], [11], [10], [9,32], [7], [5], [4], [2], [2], [1], [1], [0,33,34,35], [16], [22], [30], [30], [30], [15,37,39], [36,4,38], [37], [36], ],
   },
   quinine: {
      atoms: 'CCCCCCOCCCCCCOCNCCCCCCCCHHHHHHHHHHHHHHHHHHHHHHHH',
      positions: [
         [ 2.857,-1.786,-0.712],
         [ 2.291,-0.752,-0.068],
         [ 2.329, 0.564,-0.749],
         [ 2.895, 0.751,-1.949],
         [ 3.514,-0.413,-2.629],
         [ 3.488,-1.608,-2.031],
         [ 2.881, 1.988,-2.486],
         [ 1.689,-1.039, 1.265],
         [ 1.802,-2.319, 1.649],
         [ 2.466,-3.289, 0.761],
         [ 2.891,-2.998,-0.220],
         [ 1.002,-0.034, 2.182],
         [-0.322, 0.580, 1.631],
         [ 1.916, 0.965, 2.663],
         [-1.146, 1.319, 2.731],
         [-1.196,-0.411, 0.946],
         [-2.298, 0.276, 0.220],
         [-3.185, 1.053, 1.242],
         [-2.614, 0.817, 2.667],
         [-1.763,-1.422, 1.872],
         [-2.617,-0.709, 2.959],
         [-3.268, 2.541, 0.971],
         [-4.343, 3.272, 1.294],
         [ 3.505, 2.164,-3.772],
         [ 3.392, 3.225,-4.039],
         [ 1.898, 1.452,-0.300],
         [ 4.003,-0.371,-3.601],
         [ 3.939,-2.477,-2.515],
         [ 1.427,-2.699, 2.599],
         [ 2.549,-4.331, 1.068],
         [ 0.741,-0.551, 3.117],
         [-0.031, 1.321, 0.875],
         [ 2.254, 1.538, 1.987],
         [-1.106, 2.412, 2.588],
         [-0.755, 1.125, 3.743],
         [-2.898,-0.467,-0.331],
         [-1.878, 0.944,-0.548],
         [-4.209, 0.641, 1.216],
         [-3.227, 1.343, 3.419],
         [-0.964,-2.018, 2.332],
         [-2.382,-2.136, 1.303],
         [-3.654,-1.086, 2.953],
         [-2.204,-0.894, 3.965],
         [-2.421, 3.051, 0.507],
         [-4.369, 4.343, 1.092],
         [-5.212, 2.823, 1.772],
         [ 3.009, 1.566,-4.553],
         [ 4.582, 1.939,-3.735],
      ],
      links: [ [1,5,10], [0,2,7], [1,3,25], [2,4,6], [3,5,26], [0,4,27], [3,23], [1,8,11], [7,9,28], [8,10,29], [0,9], [7,12,13,30], [11,14,15,31], [11,32], [12,18,33,34], [12,16,19], [15,17,35,36], [16,18,21,37], [14,17,20,38], [15,20,39,40], [18,19,41,42], [17,22,43], [21,44,45], [6,24,46,47], [23], [2], [4], [5], [8], [9], [11], [12], [13], [14], [14], [16], [16], [17], [18], [19], [19], [20], [20], [21], [22], [22], [23], [23], ],
   },
};

let getAtomInfo = (name, n) => {
   let symbol = moleculesInfo[name].atoms.substring(n,n+1);
   for (let name in atomsInfo)
      if (symbol == atomsInfo[name].symbol)
         return atomsInfo[name];
   return null;
} 


