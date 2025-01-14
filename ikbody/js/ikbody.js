"use strict";

// VISUALIZE AN IK BODY

(function() {
   var p = 'ANKLE_L ANKLE_R WRIST_R WRIST_L HEAD KNEE_L KNEE_R ELBOW_R ELBOW_L CHEST HIP_L HIP_R SHOULDER_R SHOULDER_L BELLY WAIST PELVIS'.split(' ');
   window.IK = {};
   for (var i = 0 ; i < p.length ; i++)
      IK[p[i]] = i;
})();

function IKBody(ik_data) {
   this.loadData(ik_data);
   this.frame = 0;
   this.mode = 3;
   this.nodeData = this.computeNodeData();
   this.startTime = 0;
}

IKBody.prototype = {

   loadData : function(ik_data) {

      // CHANGE DATA INTO A MORE CONVENIENT FORM.

      this.data = [];
      for (var frame = 0 ; frame < ik_data.length ; frame++) {
         this.data.push([]);
         for (var j = 0 ; j < 5 ; j++) {
            var src = ik_data[frame];
            this.data[frame].push({
               q: new Quaternion(src[7*j+2], src[7*j+3], src[7*j+4], src[7*j+5]),
               p: new Vector3(src[7*j+6], src[7*j+7], src[7*j+8]),
            });
         }

         for (var j = 5 ; j < 9 ; j++) {
            var src = ik_data[frame];
            this.data[frame].push({
               q: new Quaternion(),
               p: new Vector3(),
            });
         }
      }

      // REPLACE ANY MISSING VALUES BY VALUE FROM THE NEXT VALID FRAME.

      for (var frame = ik_data.length - 1 ; frame >= 0 ; frame--) {
         for (var j = 0 ; j < 5 ; j++) {
            if (this.getP(j, frame).lengthSq() == 0)
               for (var f = frame + 1 ; f < ik_data.length ; f++)
                  if (this.getP(j, f).lengthSq() != 0) {
                     this.getP(j, frame).copy(this.getP(j, f));
                     break;
                  }

            if (this.getQ(j, frame).w == 1)
               for (var f = frame + 1 ; f < ik_data.length ; f++)
                  if (this.getQ(j, f).w != 1) {
                     this.getQ(j, frame).copy(this.getQ(j, f));
                     break;
                  }
         }
      }

      // ADJUST ORIENTATIONS TO STANDARD BODY POSE.

      var tmp = new Quaternion();

      var qAR = (new Quaternion()).copy(this.getQ(IK.ANKLE_R, 0)).inverse();
      var qAL = (new Quaternion()).copy(this.getQ(IK.ANKLE_L, 0)).inverse();

      var qWL = (new Quaternion()).copy(this.getQ(IK.WRIST_L, 0)).inverse().multiply(tmp.set(0,-.15,0,1).normalize());
      var qWR = (new Quaternion()).copy(this.getQ(IK.WRIST_R, 0)).inverse().multiply(tmp.set(0, .05,0,1).normalize());

      for (var frame = 0 ; frame < ik_data.length ; frame++) {
         this.getQ(IK.ANKLE_R, frame).multiply(qAR);
         this.getQ(IK.ANKLE_L, frame).multiply(qAL);
         this.getQ(IK.WRIST_L, frame).multiply(qWL);
         this.getQ(IK.WRIST_R, frame).multiply(qWR);
      }

      for (var frame = 0 ; frame < ik_data.length ; frame++)
         this.getP(IK.HEAD, frame).offset(0, -.1, -.1, this.getQ(IK.HEAD, frame));
   },

   computeNodeData : function() {

      function relVec(id, x, y, z) { return new Vector3().copy(nodeP[id]).offset(x, y, z); }

      var nodeP = [];
      nodeP[IK.HEAD      ] = new Vector3();

      nodeP[IK.CHEST     ] = relVec(IK.HEAD      , 0   ,  0   , 0);
      nodeP[IK.BELLY     ] = relVec(IK.CHEST     , 0   , -0.13, 0);
      nodeP[IK.WAIST     ] = relVec(IK.BELLY     , 0   , -0.13, 0);
      nodeP[IK.PELVIS    ] = relVec(IK.WAIST     , 0   , -0.13, 0);

      nodeP[IK.HIP_R     ] = relVec(IK.PELVIS    ,-0.1 ,  0   , 0);
      nodeP[IK.KNEE_R    ] = relVec(IK.HIP_R     , 0   , -0.36, 0);
      nodeP[IK.ANKLE_R   ] = relVec(IK.KNEE_R    , 0   , -0.34, 0);

      nodeP[IK.HIP_L     ] = relVec(IK.PELVIS    , 0.1 ,  0   , 0);
      nodeP[IK.KNEE_L    ] = relVec(IK.HIP_L     , 0   , -0.36, 0);
      nodeP[IK.ANKLE_L   ] = relVec(IK.KNEE_L    , 0   , -0.34, 0);

      nodeP[IK.SHOULDER_R] = relVec(IK.CHEST     ,-0.16,  0   , 0);
      nodeP[IK.ELBOW_R   ] = relVec(IK.SHOULDER_R,-0.22,  0   , 0);
      nodeP[IK.WRIST_R   ] = relVec(IK.ELBOW_R   ,-0.20,  0   , 0);

      nodeP[IK.SHOULDER_L] = relVec(IK.CHEST     , 0.16,  0   , 0);
      nodeP[IK.ELBOW_L   ] = relVec(IK.SHOULDER_L, 0.22,  0   , 0);
      nodeP[IK.WRIST_L   ] = relVec(IK.ELBOW_L   , 0.20,  0   , 0);

      return nodeP;
   },

   getLinkData : function() {
      return [
         [IK.BELLY     , IK.SHOULDER_L, 0.3],
         [IK.BELLY     , IK.SHOULDER_R, 0.3],
         [IK.SHOULDER_L, IK.SHOULDER_R     ],

         [IK.HIP_L     , IK.PELVIS    ],
         [IK.HIP_R     , IK.PELVIS    ],
         [IK.HIP_L     , IK.HIP_R     ],
         [IK.PELVIS    , IK.WAIST     ],
         [IK.WAIST     , IK.BELLY     ],
         [IK.BELLY     , IK.CHEST     ],
         [IK.CHEST     , IK.SHOULDER_L],
         [IK.CHEST     , IK.SHOULDER_R],

         [IK.ANKLE_L, IK.KNEE_L ], [IK.KNEE_L , IK.HIP_L     ],
         [IK.ANKLE_R, IK.KNEE_R ], [IK.KNEE_R , IK.HIP_R     ],
         [IK.WRIST_L, IK.ELBOW_L], [IK.ELBOW_L, IK.SHOULDER_L],
         [IK.WRIST_R, IK.ELBOW_R], [IK.ELBOW_R, IK.SHOULDER_R],

         [IK.HIP_L     , IK.SHOULDER_L, 0.2],
         [IK.HIP_R     , IK.SHOULDER_R, 0.2],
         [IK.HIP_L     , IK.SHOULDER_R, 0.2],
         [IK.HIP_R     , IK.SHOULDER_L, 0.2],

         [IK.HEAD      , IK.SHOULDER_R, 0.2],
         [IK.HEAD      , IK.SHOULDER_L, 0.2],
         [IK.CHEST     , IK.HEAD           ],
      ];
   },

   getP    : function(j, frame) { return this.data[def(frame,this.frame)][j].p; },
   getQ    : function(j, frame) { return this.data[def(frame,this.frame)][j].q; },
   getFrame: function(time)     { return floor(120 * time + this.data.length) % this.data.length; },

   getPF   : function(j) { return this.data[this.frame][j].p; },
   getQF   : function(j) { return this.data[this.frame][j].q; },

   update  : function(time, data) {
      if (this.graph === undefined) {

         function IKBodyResponder() {
            
            this.isAdjustable = function(j) { return j >= 9; }
            this.simulate = function() {

               for (var j = 0 ; j < 9 ; j++)
                  this.graph.nodes[j].p.copy(this.ikBody.getPF(j));

               // ALIGN PELVIS DIRECTION WITH HEAD DIRECTION

               this.graph.nodes[IK.HIP_L ].p.offset( .1, 0, 0, this.ikBody.getQF(IK.HEAD));
               this.graph.nodes[IK.HIP_R ].p.offset(-.1, 0, 0, this.ikBody.getQF(IK.HEAD));

               // FORCE KNEES TO BEND FORWARD, RATHER THAN BACKWARD.

               this.graph.nodes[IK.KNEE_L].p.offset( 0, 0, .02, this.ikBody.getQF(IK.ANKLE_L));
               this.graph.nodes[IK.KNEE_R].p.offset( 0, 0, .02, this.ikBody.getQF(IK.ANKLE_R));

               // FORCE SPINE TO CURVE BACKWARD, RATHER THAN FORWARD.

               this.graph.nodes[IK.PELVIS].p.offset( 0, .1, -.1, this.ikBody.getQF(IK.HEAD));
               this.graph.nodes[IK.WAIST ].p.offset( 0, 0, -.07, this.ikBody.getQF(IK.HEAD));
               this.graph.nodes[IK.BELLY ].p.offset( 0, 0, -.05, this.ikBody.getQF(IK.HEAD));

	       // PULL SHOULDERS UP AND APART

               this.graph.nodes[IK.SHOULDER_L ].p.offset( .1, .1, 0, this.ikBody.getQF(IK.HEAD));
               this.graph.nodes[IK.SHOULDER_R ].p.offset(-.1, .1, 0, this.ikBody.getQF(IK.HEAD));
            }
         }
         IKBodyResponder.prototype = new GraphResponder;

         this.graph = new Graph();

         this.responder = new IKBodyResponder();
         this.responder.ikBody = this;
         this.graph.setResponder(this.responder);

         for (var i = 0 ; i < this.nodeData.length ; i++) {
            var p = this.nodeData[i];
            this.graph.addNode(p.x, p.y, p.z);
         }

         var linkData = this.getLinkData();
         for (var i = 0 ; i < linkData.length ; i++) {
            var ij = linkData[i];
            this.graph.addLink(ij[0], ij[1], ij[2]);
         }

         this.startTime = time;
      }

      this.graph.update();

      let forceDistance = (i,j,d2,t) => {
         let A = this.graph.nodes[i].p, a = [A.x,A.y,A.z],
	     B = this.graph.nodes[j].p, b = [B.x,B.y,B.z];
         let d1 = distance(a,b);
	 let d = d1 + t * (d2 - d1);
         b = add(a, scale(subtract(b,a), d / d1));
         B.x = b[0];
         B.y = b[1];
         B.z = b[2];
      }
      forceDistance( 4, 9,.14, 1);

      this.frame = this.getFrame(time - this.startTime);

      this._computeJoint = function(a, b) {
         this.getPF(a).copy(this.nodeData[a]).sub(this.nodeData[b])
                                             .applyQuaternion(this.getQF(b))
                                             .add(this.getPF(b));
      }
      this._computeJoint(IK.KNEE_R , IK.ANKLE_R);
      this._computeJoint(IK.KNEE_L , IK.ANKLE_L);
      this._computeJoint(IK.ELBOW_L, IK.WRIST_L);
      this._computeJoint(IK.ELBOW_R, IK.WRIST_R);
   },
};

