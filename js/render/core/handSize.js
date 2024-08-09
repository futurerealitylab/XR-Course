export function HandSize() {
   let fingerPosition = [
      [ 0.0088,  0.3121],
      [-0.0723,  0.2639],
      [-0.1381,  0.1787],
      [-0.1858,  0.1081],
      [-0.2270,  0.0624],
      [-0.0529,  0.0123],
      [-0.0696, -0.1060],
      [-0.0788, -0.1783],
      [-0.0850, -0.2416],
      [-0.0008,  0.0037],
      [ 0.0055, -0.1285],
      [ 0.0082, -0.2101],
      [ 0.0137, -0.2816],
      [ 0.0454,  0.0270],
      [ 0.0664, -0.0917],
      [ 0.0744, -0.1659],
      [ 0.0806, -0.2331],
      [ 0.0878,  0.0753],
      [ 0.1303, -0.0007],
      [ 0.1552, -0.0547],
      [ 0.1768, -0.1085],
   ];

   let pairs = [ [1,2], [5,6], [9,10], [13,14], [17,18] ];

   let distance = (pose,k) => {
      let a = pose[pairs[k][0]],
          b = pose[pairs[k][1]],
          x = b[0] - a[0], y = b[1] - a[1];
      return Math.sqrt(x * x + y * y);
   }

   let S = [];
   for (let k = 0 ; k < pairs.length ; k++)
      S.push(distance(fingerPosition, k));

   this.compute = pose => {
      let size = 0;
      for (let k = 0 ; k < pairs.length ; k++)
         size = Math.max(size, distance(pose, k) / S[k]);
      return size;
   }
}
