import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

// This is an experience for two users:
//    User 0 can see the labels only of even numbered tiles, unless the tile is higher than y = 1.2.
//    User 1 can see the labels only of odd numbered tiles, unless the tile is highter than y = 1.2.
//    Each user can manipulate only those tiles whose labels they can currently see.

let words = 'Alice,Albert,Brenda,Ben,Cathy,Carl,Debra,Dennis,Ellen,Edgar,Fiona,Fred,Ginny,Glen'.split(',');
let pink = '#ff8080', blue = '#00c0ff', myGender, yShare = 1.2;
let lightPink = '#ffc0c0', lightBlue = '#80e4ff';

let p = [];                                       // DEFAULT TILE POSITIONS
for (let n = 0 ; n < words.length ; n++)
   p.push([.21 * (n>>1) - .63, .9, .4 * (n&1) - .2]);

server.init('p3S', { p: p, id: 0 });              // PERSISTENT STATE OBJECT
server.init('p3I', {});                           // MESSAGE PASSING OBJECT

export const init = async model => {
   let g3 = new G3(model, draw => {
      let w = .2, h = .075, b = .003, p;
      if (p = p3S.p)                              // RENDER WORD TILES AFTER DATA HAS LOADED.
         for (let n = 0 ; n < p.length ; n++) {   // IF A TILE IS MY GENDER OR IS IN THE SHARED
            let tileGender = n & 1;               // SPACE, THEN ALSO RENDER ITS LABEL.
            let sharedTile = p[n][1] > yShare;
            draw.color('black').fill2D([[-w-b,-h-b],[w+b,-h-b],[w+b,h+b],[-w-b,h+b]], p[n]);
            let tileColor = sharedTile ? tileGender ? lightBlue : lightPink : tileGender ? blue : pink;
            draw.color(tileColor).fill2D([[-w,-h],[w,-h],[w,h],[-w,h]], p[n]);
            if (sharedTile || myGender == tileGender)
               draw.color('black').textHeight(.03).text(words[n], p[n]);
         }
      if (draw.view() == 0)                       // WHILE EITHER HAND IS PINCHING, SEND THE PINCH
         for (let hand in {left:{}, right:{}})    // POSITION AND MY GENDER TO ALL CLIENTS.
            if (draw.pinch(hand,1)) {
	       let f = draw.finger(hand,1);
	       if (f)
                  server.send('p3I', { pinch: cg.roundVec(4, f), gender: myGender });
            }
   });
   model.animate(() => {
      myGender = clientID == clients[0] ? 1 : 0;
      p3S = server.synchronize('p3S');            // SYNCHRONIZE THE PERSISTENT STATE OBJECT.
      if (p3S.p) {
         server.sync('p3I', msgs => {             // RESPOND TO A PINCH BY MOVING THE NEAREST TILE
            for (let id in msgs)                  // THAT I'M ALLOWED TO MOVE TO THE PINCH POSITION.
               if (msgs[id].pinch) {
                  let f = msgs[id].pinch, d, dMin = .1, nMin = -1;
                  for (let n = 0 ; n < p3S.p.length ; n++) {
                     let tileGender = n & 1;
                     let sharedTile = p3S.p[n][1] > yShare;
                     if (sharedTile || msgs[id].gender == tileGender)
                        if ((d = cg.distance(p3S.p[n], f)) < dMin) {
                           nMin = n;
                           dMin = d;
                        }
                  }
		  if (nMin != -1)
                     p3S.p[nMin] = f;
               }
         });
         if (clientID == clients[0])              // THE FIRST CLIENT DETERMINES THE SHARED
            server.broadcastGlobal('p3S');        // STATE OF ALL CLIENTS.
      }
      g3.update();                                // UPDATE THE G3 SCENE.
   });
}
