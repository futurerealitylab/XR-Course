import * as cg from "./cg.js";

export function G3Avatars(g3) {
   let id, m, p, fw = [.021,.019,.018,.017,.015];
   this.update = () => {
      g3.color('#0080f0');
      for (let n = 0 ; n < clients.length ; n++)
         if ((id = clients[n]) != clientID) {
	    if (m = clientState.head(id)) {
	       p = cg.mTransform(m,[0,0,0]);
	       g3.lineWidth(.04).line(p,p);
            }
	    for (let hand in {left:0,right:0})
	       for (let i = 0 ; i < 5 ; i++)
	          if (p = clientState.finger(id,hand,i))
	             g3.lineWidth(fw[i]).line(p,p);
         }
   }
}


