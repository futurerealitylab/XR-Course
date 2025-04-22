"use strict";
import { Vector3 } from "./vector3.js";
import { Quaternion } from "./quaternion.js";
import { Graph, GraphResponder } from "./graph.js";
import { add, distance, scale, subtract } from "../cg.js";

// VISUALIZE AN IK BODY

(function() {
   var p = 'ANKLE_L ANKLE_R WRIST_R WRIST_L HEAD KNEE_L KNEE_R ELBOW_R ELBOW_L CHEST HIP_L HIP_R SHOULDER_R SHOULDER_L BELLY WAIST PELVIS'.split(' ');
   window.IK = {};
   for (var i = 0 ; i < p.length ; i++)
      IK[p[i]] = i;
})();

export function IKBody() {
   this.nodeData = this.computeNodeData();
   this.pos = [];
   this.qua = [];
   for (let i = 0; i < 17; ++i) {
      this.pos.push(new Vector3());
      this.qua.push(new Quaternion());
   }
   this.quaBODY = new Quaternion();
   this.graph;
   this.responder;
}

IKBody.prototype = {

   computeNodeData : function(headX = 0, headY = 1.7, headZ = 0) {

      function relVec(id, x, y, z) { return new Vector3().copy(nodeP[id]).offset(x, y, z); }

      var nodeP = [];
      nodeP[IK.HEAD      ] = new Vector3(headX, headY, headZ);

      nodeP[IK.CHEST     ] = relVec(IK.HEAD      , 0   , -0.13, 0);
      nodeP[IK.BELLY     ] = relVec(IK.CHEST     , 0   , -0.13, 0);
      nodeP[IK.WAIST     ] = relVec(IK.BELLY     , 0   , -0.13, 0);
      nodeP[IK.PELVIS    ] = relVec(IK.WAIST     , 0   , -0.13, 0);

      nodeP[IK.HIP_R     ] = relVec(IK.PELVIS    , 0.1 ,  0   , 0);
      nodeP[IK.KNEE_R    ] = relVec(IK.HIP_R     , 0   , -0.36, 0);
      nodeP[IK.ANKLE_R   ] = relVec(IK.KNEE_R    , 0   , -0.34, 0);

      nodeP[IK.HIP_L     ] = relVec(IK.PELVIS    ,-0.1 ,  0   , 0);
      nodeP[IK.KNEE_L    ] = relVec(IK.HIP_L     , 0   , -0.36, 0);
      nodeP[IK.ANKLE_L   ] = relVec(IK.KNEE_L    , 0   , -0.34, 0);

      nodeP[IK.SHOULDER_R] = relVec(IK.CHEST     , 0.16,  0   , 0);
      nodeP[IK.ELBOW_R   ] = relVec(IK.SHOULDER_R, 0.22,  0   , 0);
      nodeP[IK.WRIST_R   ] = relVec(IK.ELBOW_R   , 0.20,  0   , 0);

      nodeP[IK.SHOULDER_L] = relVec(IK.CHEST     ,-0.16,  0   , 0);
      nodeP[IK.ELBOW_L   ] = relVec(IK.SHOULDER_L,-0.22,  0   , 0);
      nodeP[IK.WRIST_L   ] = relVec(IK.ELBOW_L   ,-0.20,  0   , 0);

      return nodeP;
   },

   getLinkData : function() {
      return [
         [IK.BELLY     , IK.SHOULDER_L, 0.01],
         [IK.BELLY     , IK.SHOULDER_R, 0.01],
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

         [IK.HIP_L     , IK.SHOULDER_L, 0.01],
         [IK.HIP_R     , IK.SHOULDER_R, 0.01],
         [IK.HIP_L     , IK.SHOULDER_R, 0.01],
         [IK.HIP_R     , IK.SHOULDER_L, 0.01],

         [IK.HEAD      , IK.SHOULDER_R, 0.2],
         [IK.HEAD      , IK.SHOULDER_L, 0.2],
         [IK.CHEST     , IK.HEAD           ],
      ];
   },

   getP: function(j) { return this.pos[j]; },
   getQ: function(j) { return this.qua[j]; },

   initGraph : function() {
         function IKBodyResponder() {

            this.isAdjustable = function(j) { return j > 4 && j != 9; }
            this.simulate = function() {

               for (var j = 0 ; j < 10 ; j++)
                  this.graph.nodes[j].p.copy(this.ikBody.getP(j));

               let qBODY = this.ikBody.quaBODY;

               // ALIGN PELVIS DIRECTION WITH HEAD DIRECTION

               this.graph.nodes[IK.HIP_L ].p.offset(-.3, 0, 0, qBODY);
               this.graph.nodes[IK.HIP_R ].p.offset( .3, 0, 0, qBODY);

               // FORCE KNEES TO BEND FORWARD, RATHER THAN BACKWARD.

               this.graph.nodes[IK.KNEE_L].p.offset( 0, 0, -.3, qBODY);
               this.graph.nodes[IK.KNEE_R].p.offset( 0, 0, -.3, qBODY);

               // FORCE SPINE TO CURVE BACKWARD, RATHER THAN FORWARD.

               this.graph.nodes[IK.PELVIS].p.offset( 0, .1, .1, qBODY);
               this.graph.nodes[IK.WAIST ].p.offset( 0, 0, .07, qBODY);
               this.graph.nodes[IK.BELLY ].p.offset( 0, 0, .05, qBODY);

               // PULL SHOULDERS UP AND APART

               this.graph.nodes[IK.SHOULDER_L ].p.offset(-.1, 0, 0, qBODY);
               this.graph.nodes[IK.SHOULDER_R ].p.offset( .1, 0, 0, qBODY);

               // FORCE ELBOWS TO BEND BACKWARD.
               this.graph.nodes[IK.ELBOW_L].p.offset( 0, -.1, 1, qBODY);
               this.graph.nodes[IK.ELBOW_R].p.offset( 0, -.1, 1, qBODY);
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

   },

   update  : function(headRotY) {
      this.getQ(IK.HEAD)   .copy(this.quaBODY);
      this.getQ(IK.WRIST_L).copy(this.quaBODY);
      this.getQ(IK.WRIST_R).copy(this.quaBODY);
      this.getQ(IK.ANKLE_L).copy(this.quaBODY);
      this.getQ(IK.ANKLE_R).copy(this.quaBODY);
      if (headRotY !== null) {
         this.getQ(IK.HEAD)   .multiply(new Quaternion(0, Math.sin(headRotY/2), 0, Math.cos(headRotY/2)));
         this.getQ(IK.WRIST_L).multiply(new Quaternion(0, Math.sin(headRotY/4), 0, Math.cos(headRotY/4)));
         this.getQ(IK.WRIST_R).multiply(new Quaternion(0, Math.sin(headRotY/4), 0, Math.cos(headRotY/4)));
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
      // forceDistance( 4, 9,.14, 1);

      this._computeJoint = function(a, b) {
         this.getP(a).copy(this.nodeData[a]).sub(this.nodeData[b])
                                             .applyQuaternion(this.getQ(b))
                                             .add(this.getP(b));
      }
      this._computeJoint(IK.CHEST, IK.HEAD);
      this._computeJoint(IK.KNEE_R , IK.ANKLE_R);
      this._computeJoint(IK.KNEE_L , IK.ANKLE_L);
      this._computeJoint(IK.ELBOW_L, IK.WRIST_L);
      this._computeJoint(IK.ELBOW_R, IK.WRIST_R);
   },
};

