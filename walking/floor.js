
let Floor = function() {
   let myCube   = Cube();
   this.update = time => {}
   this.draw = nf => {
      M.S().scale(.5/nf);
         M.S().move(0,-.1,0).scale(nf,.101,nf).color([.2,.05,.025]).draw(myCube).R();
         for (let i = -nf ; i <= nf ; i += 2) {
            M.S().move(i,0,0).scale(.01,.002,nf).color([0,0,0]).draw(myCube).R();
            M.S().move(0,0,i).scale(nf,.002,.01).color([0,0,0]).draw(myCube).R();
         }
      M.R();
   }
}

