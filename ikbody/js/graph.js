"use strict";

function GraphNode(x, y, z, type) {
   this.p = new Vector3(x, y, z);
   this.type = type;
}

function GraphLink(i, j, w, type) {
   this.i = i;
   this.j = j;
   this.w = w;
   this.type = type;
}

function Graph() {
   this.isUpdating = function() { return true; }

   this.nodes = [];
   this.links = [];

   this.removedNodes = [];
   this.removedLinks = [];
   this.lengths = [];
}

Graph.prototype = {
   tmp: new Vector3(),

   addNode: function(x,y,z,type) {
      if (z === undefined)
         z = 0;
      this.nodes.push(new GraphNode(x,y,z,type));
      return this.nodes.length - 1;
   },

   addLink: function(i, j, w, type) {
      if (w === undefined)
         w = 1;
      this.links.push(new GraphLink(i, j, w, type));
      this.computeLengths();
      return this.links.length - 1;
   },

   adjustDistance: function(A, B, d, e, isAdjustingA, isAdjustingB) {
      var ratio = d / A.distanceTo(B);
      ratio = max(0.5, min(1.5, ratio));
      this.tmp.copy(B).sub(A).multiplyScalar( e * (ratio - 1) );
      if (isAdjustingA === undefined || isAdjustingA)
         A.sub(this.tmp);
      if (isAdjustingB === undefined || isAdjustingB)
         B.add(this.tmp);
   },

   adjustNodePositions: function() {
      for (var j = 0 ; j < this.nodes.length ; j++) {
         var node = this.nodes[j];
         if (node.d !== undefined) {
            this.tmp.copy(node.d).multiplyScalar(0.1);
            node.p.add(this.tmp);
            this.tmp.negate();
            node.d.add(this.tmp);
         }
      }
   },

   nodesAvoidEachOther: function() {
      for (var i = 0 ; i < this.nodes.length-1 ; i++)
         for (var j = i+1 ; j < this.nodes.length ; j++)
	    if (! this.R || this.R.isAdjustable(i) && this.R.isAdjustable(j)) {
               var a = this.nodes[i];
               var b = this.nodes[j];
               if (a.r !== undefined && b.r !== undefined) {
                  var d = a.p.distanceTo(b.p);
                  if (d < a.r + b.r) {
                     var t = (a.r + b.r) / d;
                     this.tmp.copy(a.p).lerp(b.p,.5);
                     a.p.lerp(this.tmp, 1 - t);
                     b.p.lerp(this.tmp, 1 - t);
                  }
               }
            }
   },

   adjustEdgeLengths: function() {
      var R = this.R;
      for (var rep = 0 ; rep < 10 ; rep++)
         for (var n = 0 ; n < this.lengths.length ; n++) {
            var L = this.lengths[n];
            var a = this.nodes[L.i];
            var b = this.nodes[L.j];
            this.adjustDistance(a.p, b.p, L.d, L.w/2, ! R || R.isAdjustable(L.i), ! R || R.isAdjustable(L.j));
         }
   },

   update: function() {
      if (this.isUpdating()) {
         if (this.R)
            this.R.simulate();
         this.updatePositions();
      }
   },

   updatePositions: function() {
      this.adjustNodePositions(); // Adjust position as needed after mouse press on a node.
      this.nodesAvoidEachOther(); // Make sure nodes do not intersect.
      this.adjustEdgeLengths();   // Coerce all links to be the proper length.
   },

   findLink: function(i, j, links) {
      if (links === undefined)
         links = this.links;
      if (i != j)
         for (var l = 0 ; l < links.length ; l++) {
            var link = links[l];
            if (link.i == i && link.j == j || link.i == j && link.j == i)
               return l;
         }
      return -1;
   },

   computeLengths: function() {
      this.lengths = [];
      for (var i = 0 ; i < this.nodes.length - 1 ; i++)
      for (var j = i + 1 ; j < this.nodes.length ; j++) {
         var l = this.findLink(i, j);
         if (l >= 0) {
            var link = this.links[l];
            var d = this.nodes[i].p.distanceTo(this.nodes[j].p);
            this.lengths.push({ i:i, j:j, d:d, w:link.w });;
         }
      }
   },

   setResponder: function(R) {
      this.R = R;
      R.graph = this;
      R.setup();
   },
};

function GraphResponder() {
   this.clickType = 'none';
   this.clickPoint = new Vector3();
   this.graph;
   this.I = -1;
   this.J = -1;
   this.K = -1;
   this.setup = function() { }
   this.simulate = function() { }
   this.isAdjustable = function(i) { return i != this.I && i != this.J; }
}

