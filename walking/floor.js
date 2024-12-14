
let Floor = function() {
   let myCube   = Cube();
   this.update = time => {}
   this.draw = nf => {
      M.S().scale(.5/nf);
         M.S().move(0,-.1,0).scale(nf,.101,nf).draw(myCube,[.2,.05,.025]).R();
         for (let i = -nf ; i <= nf ; i += 2) {
            M.S().move(i,0,0).scale(.01,.002,nf).draw(myCube,[0,0,0]).R();
            M.S().move(0,0,i).scale(nf,.002,.01).draw(myCube,[0,0,0]).R();
         }
      M.R();
   }
}

