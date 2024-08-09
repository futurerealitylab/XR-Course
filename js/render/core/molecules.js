import * as cg from "./cg.js";

export let moleculeNames = [];
for (let name in moleculesInfo)
   moleculeNames.push(name);

export let addMolecule = (parent, name) => {
   if (! clay.formMesh(name)) {
      let obj = parent.add();
      let molecule = obj.add().turnX(Math.PI).scale(.6);
      let info = moleculesInfo[name];
      for (let i = 0 ; i < info.atoms.length ; i++) {
         let atomInfo = getAtomInfo(name, i);
         molecule.add('sphere6').move(info.positions[i])
                                .scale(atomInfo.radius / 150)
                                .color(atomInfo.color);
      }
      for (let i = 0 ; i < info.links.length ; i++)
         for (let j = 0 ; j < info.links[i].length ; j++)
            molecule.add('tube6').color(.25,.25,.25)
	                         .link(info.positions[i],
                                       info.positions[info.links[i][j]], .07);
      obj.newForm(name);
      parent.remove(obj);
   }
   return parent.add(name);
}

export let hitMolecule = (name, p) => {
   let info = moleculesInfo[name];
   for (let i = 0 ; i < info.atoms.length ; i++) {
      let q = info.positions[i];
      let x = q[0]-p[0], y = q[2] - p[2];
      if (x * x + y * y < 1)
         return true;
   }
   return false;
}
