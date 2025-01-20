//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// TEXTURE CODE EDITOR EVENTS //////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////


let isAlt = false, isControl = false, isMeta = false, isShift = false,
    wasAlt = false, wasControl = false, wasMeta = false, wasShift = false;

let onKeyDown = event => {
   switch (event.key) {
   case 'Alt':     isAlt     = true; break;
   case 'Control': isControl = true; break;
   case 'Meta':    isMeta    = true; break;
   case 'Shift':   isShift   = true; break;
   }
}

let onKeyUp = event => {
   if(window.interactMode == 1){
   let insertChar = ch => {
      let i = codeText.selectionStart;
      codeText.value = codeText.value.substring(0, i) + ch + codeText.value.substring(i, codeText.value.length);
      codeText.selectionStart = codeText.selectionEnd = i+1;
   }
   let deleteChar = () => {
      if (codeText.value.length > 0) {
         let i = codeText.selectionStart;
         codeText.value = codeText.value.substring(0, i-1) + codeText.value.substring(i, codeText.value.length);
         codeText.selectionStart = codeText.selectionEnd = i-1;
      }
   }
   let deleteRange = () => {
      let i = codeText.selectionStart;
      let j = codeText.selectionEnd;
      codeText.value = codeText.value.substring(0, i) + codeText.value.substring(j, codeText.value.length);
      codeText.selectionStart = codeText.selectionEnd = i;
   }
   let deleteAll = () => {
      codeText.value = '';
      codeText.selectionStart = codeText.selectionEnd = 0;
   }
   switch (event.key) {
   case 'Alt':     isAlt     = false; wasAlt     = true; return;
   case 'Control': isControl = false; wasControl = true; return;
   case 'Meta':    isMeta    = false; wasMeta    = true; return;
   case 'Shift':   isShift   = false; wasShift   = true; return;
   }

   if (wasMeta) {
      let key = event.key.toUpperCase().charCodeAt(0);
      switch (event.key) {
      case 'ArrowLeft' : key = 37; break;
      case 'ArrowUp'   : key = 38; break;
      case 'ArrowRight': key = 39; break;
      case 'ArrowDown' : key = 40; break;
      default          : deleteChar(); break;
      }
      modeler.onKeyUp(key);
      wasAlt = wasControl = wasMeta = wasShift = false;
      return;
   }

   if (enableModeling) {
      switch (event.key) {
         case 'Escape':
            modeler.setShowingCode(false);
            break;
         case '`':
            deleteChar();
            modeler.parseCode(codeText.value);
            break;
         case ' ':
         case "'":
         case '"':
         case '/':
            insertChar(event.key);
            break;
         case '?':
            modeler.toggleRubber();
            break;
         case 'Enter':
            if (isShift) {
               deleteChar();
               modeler.rotatey(1);
            }
            break;
         case 'Backspace':
            if (isShift)
               deleteAll();
            else if (codeText.selectionStart < codeText.selectionEnd)
               deleteRange();
            else
               deleteChar();
            break;
         case 'ArrowLeft':
            if (isShift) {
               modeler.prevTexture();
               codeText.value = modeler.getTexture();
               modeler.parseCode(codeText.value);
            }
            else {
               let i = codeText.selectionStart;
               codeText.selectionStart = codeText.selectionEnd = Math.max(0, i-1);
            }
            break;
         case 'ArrowRight':
            if (isShift) {
               modeler.nextTexture();
               codeText.value = modeler.getTexture();
               modeler.parseCode(codeText.value);
            }
            else {
               let i = codeText.selectionStart;
               codeText.selectionStart = codeText.selectionEnd = Math.min(codeText.value.length, i+1);
            }
            break;
         case 'ArrowUp':
            {
               let i = Math.min(codeText.value.length - 1, codeText.selectionStart);
               let i0 = i;
               while (i0 >= 0 && codeText.value.charAt(i0) != '\n')
                  i0--;
               let di = i - i0;
               if (i0 > 0) {
                  i = i0 - 1;
                  while (i >= 0 && codeText.value.charAt(i) != '\n')
                     i--;
                  i = Math.min(i + di, i0 - 1);
               }
               else
                  i = 0;
               codeText.selectionStart = codeText.selectionEnd = i;
            }
            break;
         case 'ArrowDown':
            {
               let i = codeText.selectionStart;
               let i0 = i;
               while (i0 >= 0 && codeText.value.charAt(i0) != '\n')
                  i0--;
               let di = i - i0;
               let i1 = i;
               while (i1 < codeText.value.length && codeText.value.charAt(i1) != '\n')
                  i1++;
               i = Math.min(codeText.value.length, i1 + di);
               codeText.selectionStart = codeText.selectionEnd = i;
            }
            break;
         }
   }

   wasAlt = wasControl = wasMeta = wasShift = false;

   }
}

if (isModeler) {
         if (window.vr && ! window.suppress_vrWidgets)
            this.vrWidgets.identity();
         else
            this.vrWidgets.scale(0);

         if (window.animate)
            window.animate();

         if (! window.isVideo) {
            videoScreen1.scale(0);
            videoScreen2.scale(0);
         }
         else {
            let s = 3.8;
            let videoScreen = model._isHUD ? videoScreen1 : videoScreen2;
            videoScreen.setMatrix(cg.mInverse(views[0].viewMatrix))
                       //.move(0,0,-.3*s).turnY(Math.PI).scale(.3197*s,.2284*s,.001).scale(.181);
                       .move(0,0,-.3*s).scale(.3197*s,.2284*s,.001).scale(.181);
         }

         if (window.interactMode != 2) {
            anidrawScreen.scale(0);
         }
         else {
            let s = 3.8;
            anidrawScreen.setMatrix(cg.mInverse(views[0].viewMatrix))
                         .move(0,0,-.3*s)
                         .move(0,-.08*anidrawSlant,0).turnX(-1.2*anidrawSlant)
                         //.turnY(Math.PI).scale(.3197*s,.2284*s,.001).scale(.181);
                         .scale(.3197*s,.2284*s,.001).scale(.181);
         }

         setUniform('1i', 'uWhitescreen', window.isWhitescreen);       
         clay.peopleBillboards.update();
         root.evalTextures();
         root.render(vm);
         if (window.onlyScene) {
            if (! window.ONLY_SCENE_LOADED)
               chooseFlag(onlyScene);
            window.ONLY_SCENE_LOADED = true;
         }
         model.setControls();
      }

      else {
         if (scene_to_load) {
            scene = scene_to_load;
            scene_to_load = null;

            modelIndex = 0;
            let model = scene[modelIndex];
            name         = model.name;
            S            = model.S;
            isRubber     = false;
            toRubber     = model.isRubber;
            isWalking    = model.isWalking;
            isWiggling   = model.isWiggling;
            textureState = model.textureState;
            if (model.texture) {
               textures[0] = model.texture;
               codeText.value = textures[0];
               this.setShowingCode(isShowingCode);
               this.parseCode(textures[0]);
            }
            activeSet(true);
         }

         // IF ANY ANIMATED TEXTURE, OPTIMIZE RENDERING FOR THAT

         isAnimatedTexture = textures[textureIndex].includes('time');
         if (isAnimatedTexture)
            activeSet(true);
      }      



      // HANDLE EXPERIMENTS

      if (isExperiment) {
         let rMinSave = rMin;
         rMin = .02;
         let x = -.9, y = 0, z = 0;
         for (let i = 0 ; i < 100 ; i++) {
            let theta = Math.sin(i/4);
            let dx = .03 * Math.cos(theta);
            let dy = .03 * Math.sin(theta);
            createBegin(x,y);
            createDrag(x+dx,y+dy);
            x += dx * .8;
            y += dy * .8;
         }
         rMin = rMinSave;
      }
      isExperiment = false;

      // DRAW REMOTE OBJ
      this.renderSyncObj(remoteObjRoot);

      // DRAW REMOTE USER
      this.renderSyncAvatar(remoteAvatarRoot);

      // SHOW CENTERING INDICATOR

      if (! isRubber && isCentering)
         if (isMirroring) {
            draw(cubeMesh, 'black', [-.01,0,0], null, [.002,2,.002]);
            draw(cubeMesh, 'black', [ .01,0,0], null, [.002,2,.002]);
         }
         else
            draw(cubeMesh, 'black', null, null, [.0025,2,.0025]);

      // ADVANCE THE "ACTIVE REMESHING" TIMER

      activeTimer();

      // SAVE MATRICES BEFORE DOING ANY JOINT ROTATION

      for (let n = 0 ; n < S.length ; n++)
         S[n].M_save = S[n].M.slice();

      // HANDLE WIGGLING ANIMATION

      wiggleFactor = Math.max(0, Math.min(1, wiggleFactor + (isWiggling ? .03 : -.03)));
      if (S.length > 0 && wiggleFactor > 0) {
         let w = .08 * wiggleFactor;
         let wiggleRot = n =>
            matrix_multiply(
            matrix_multiply(matrix_rotateX(w * Math.sin(8 * time + S[n].id *  5)),
                            matrix_rotateY(w * Math.sin(8 * time + S[n].id * 10))),
                            matrix_rotateZ(w * Math.sin(8 * time + S[n].id * 15)));
         rotateAboutPoint(0, wiggleRot(0), S[0].M.slice(12,15));
         for (let n = 0 ; n < S.length ; n++)
            if (S[n].jointPosition) {
               S[n].jointRotation = wiggleRot(n);
               rotateAboutJoint(n);
            }
      }

      // HANDLE BLINKING EYES

      let blink = time > blinkTime - .1;
      if (time > blinkTime)
         blinkTime = time + 1 + 5 * Math.random();

      for (let n = 0 ; n < S.length ; n++)
         if ( S[n].name == 'right_eye' ||
              S[n].name == 'left_eye' ) {
            S[n].jointRotation = blink ? matrix_scale(.01,.01,.01) : matrix_identity();
            rotateAboutJoint(n);
         }
 
      // HANDLE PROCEDURAL WALKING ANIMATION

      walkFactor = Math.max(0, Math.min(1, walkFactor + (isWalking ? .06 : -.06)));
      if (S.length > 0 && walkFactor > 0) {

         let bird = ! hasPart('left_upper_leg') || hasPart('right_lower_arm') && ! hasPart('right_hand');
         let w = cg.ease(walkFactor) * .7;
         let tR = bird ? 8 * time : 4 * time;
         let tL = tR + Math.PI;

         let walkRot = n => {
            let mm = matrix_multiply, rx = matrix_rotateX, ry = matrix_rotateY, rz = matrix_rotateZ;
            let cos = Math.cos, sin = Math.sin;
            let m = matrix_identity();
            switch (S[n].name) {

            case 'belly': m = mm(matrix_translate(0, w * (bird ? .05 : -.05) * sin(2 * tR), 0), rz(w * .1 * cos(tR))); break;
            case 'chest': m = mm(rz(w * -.13 * cos(tR)), rx(w * -.05 * cos(2 * tR))); break;
            case 'head' : m = mm(rx(w *  .03 * cos(2 * tR)), rz(w *  .1  * cos(tR))); break;

            case 'right_upper_arm': m = mm(ry(bird ? 0 : w *  (cos(tR)-.5)/2), rz(bird ? w* (cos(2*tR)+1)/4 :  w)); break;
            case 'left_upper_arm' : m = mm(ry(bird ? 0 : w * -(cos(tL)-.5)/2), rz(bird ? w*-(cos(2*tL)+1)/4 : -w)); break;

            case 'right_lower_arm': m = mm(rx(bird ? 0 : w * (-sin(tR)-1)/2), rz(bird ?  sin(2*tR)/8 :  w)); break;
            case 'left_lower_arm' : m = mm(rx(bird ? 0 : w * (-sin(tL)-1)/2), rz(bird ? -sin(2*tL)/8 : -w)); break;

            case 'right_hand'     : m = rx(w * -sin(tR)/4); break;
            case 'left_hand'      : m = rx(w * -cos(tR)/4); break;

            case 'right_upper_leg': m = mm(rz(w* .05 * (sin(tR)-.5)), rx(w*(bird ? -cos(tR)+1.5 : 1.5*cos(tR)-.5)/2)); break;
            case 'left_upper_leg' : m = mm(rz(w*-.05 * (sin(tL)+.5)), rx(w*(bird ? -cos(tL)+1.5 : 1.5*cos(tL)-.5)/2)); break;

            case 'right_lower_leg': m = rx(w * (bird ? sin(tR) - 1 : (sin(tR) + 1)*1.5)); break;
            case 'left_lower_leg' : m = rx(w * (bird ? sin(tL) - 1 : (sin(tL) + 1)*1.5)); break;

            case 'right_foot'     : m = rx(w * (bird ? cos(tR)/2 - sin(tR)/2 : -cos(tR)/2)); break;
            case 'left_foot'      : m = rx(w * (bird ? cos(tL)/2 - sin(tL)/2 : -cos(tL)/2)); break;
            }
            return m;
         }
         rotateAboutPoint(0, walkRot(0), S[0].M.slice(12,15));
         for (let n = 0 ; n < S.length ; n++)
            if (S[n].jointPosition) {
               S[n].jointRotation = walkRot(n);
               rotateAboutJoint(n);
            }
      }

      // SHOW JOINTS IF IN JOINT SHOWING MODE

      if (isShowingJoints) {

         let linkCount = 0;

         let drawJoint = n => {         // DRAW A JOINT
               let s = S[n];
               M.save();
                  M.setValue(matrix_multiply(vm, s.M));
                  if (s.jointPosition)
                     M.translate(s.jointPosition);
                  let sc = i => .02 / cg.norm(M.getValue().slice(4*i,4*i+3));
                  M.scale(sc(0), sc(1), sc(2));
                  draw(sphereMesh, [1,1,1]);
               M.restore();
         }

         let drawLink = (p1, p2, r) => {       // DRAW A LINK BETWEEEN TWO JOINTS
            M.save();
               M.setValue(vm);
               M.translate(cg.mix(p1, p2, 0.5));
               let dp = [p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]];
               M.aimZ(dp);
               M.scale(r,r,cg.norm(dp) / 2);
               draw(tubeMesh, 'white');
            M.restore();
            linkCount++;
         }

         // CONNECT FIRST BLOB TO ITS CHILDREN

         drawJoint(0);
         let p0 = matrix_transform(S[0].M, [0,0,0]);
         for (let i = 0 ; i < S.length ; i++)
            if (S[i].parentID == S[0].id)
               drawLink(p0, matrix_transform(S[i].M, S[i].jointPosition), .005);

         // SHOW ALL JOINTS AND PARENT/CHILD CONNECTIONS

         for (let n = 1 ; n < S.length ; n++) {
            let s = S[n];
            if (s.jointPosition) { 
               drawJoint(n);
               if (parent(s) && parent(s).jointPosition)
                  drawLink(matrix_transform(parent(s).M, parent(s).jointPosition),
                           matrix_transform(s.M, s.jointPosition), .01);
            }
         }
      }

      // SPECIFY THE BLOBS FOR THE MODEL
   
      for (let n = 0 ; n < S.length ; n++) {
         M.save();

            let materialId = S[n].color;
            let m = materials[materialId];
            if (isRubber)
               m.specular = [0,0,0,20];

            // IF NOT IN BLOBBY MODE, DRAW THE SHAPE

            else {
               let m = materials[materialId];
               if (n == mn)
                  m.texture = [.5,0,0,0];
               M.save();
               M.setValue(cg.mMultiply(vm, S[n].M));
               let name = S[n].form + (S[n].rounded ? ',rounded' : '');
               if (S[n].info) {
                  name += ',' + S[n].info;
                  if (! formMesh[name])
                     setFormMesh(name,
                        S[n].form == 'label'     ? createTextMesh(S[n].info)
                      : S[n].form == 'particles' ? createParticlesMesh(S[n].info)
                                                 : createMesh(64, 32, uvToForm,
                                                   {
                                                     form   : S[n].form,
                                                     rounded: S[n].rounded,
                                                     info   : S[n].info
                                                   }));
               }
               draw(formMesh[name], materialId, null, null, null, S[n].texture, S[n].txtr, S[n].bumpTexture, S[n].dull, S[n].flags, S[n].customShader, S[n].opacity, S[n].view);
               M.restore();
               if (m && m.texture)
                  delete m.texture;
            }

         M.restore();
      }

      // IF SHOWING JOINTS, MAKE BLOB MODEL MOTTLED AND TRANSPARENT

      setUniform('1f', 'uNoisy'  , isRubber ? 1 : 0);
      setUniform('1f', 'uOpacity', isShowingJoints ? .3 : 1);
      M.save();
      M.setValue(vm);
      M.restore();
      setUniform('1f', 'uNoisy'  , 0);
      setUniform('1f', 'uOpacity', 1);

      // SHOW VISUAL HINT OF ANY NEGATIVE SHAPES

      if (! isRubber) {
         setUniform('1f', 'uOpacity', .25);
         for (let n = 0 ; n < S.length ; n++)
            if (S[n].sign == -1) {
               M.save();
                  M.setValue(matrix_multiply(vm, S[n].M));
                  let m = materials[S[n].color],
                  form = S[n].form;
                  if (n == mn)
                     m.texture = [.5,0,0,0];
                  let name = form + (S[n].rounded ? ',rounded' : '');
                  draw(formMesh[name], S[n].color);
                  if (m.texture)
                     delete m.texture;
               M.restore();
            }
         setUniform('1f', 'uOpacity', 1);
      }

      M.restore();

      // RESTORE MATRICES TO BEFORE JOINT ROTATIONS

      for (let n = 0 ; n < S.length ; n++)
         S[n].M = S[n].M_save;

      // HANDLE ROTATING THE MODEL
   
      let delta = 2 * deltaTime;

      let rotateModel = (rotate, rotateState, matrix_rotate, offset) => {
         let rotateTarget = Math.PI / 2 * rotateState;
         if (rotate != rotateTarget) {
            let rotateBy = 0;
            if (rotate > rotateTarget + delta)
               rotateBy = -delta;
            if (rotate < rotateTarget - delta)
               rotateBy = delta;
            if (Math.abs(rotate - rotateTarget) < delta)
               rotateBy = rotateTarget - rotate;
            modelMatrix = cg.mMultiply(matrix_rotate(rotateBy), modelMatrix);
            rotate += rotateBy;
            mn = findBlob(xPrev, yPrev);
         }
         return rotate;
      }
      rotatex = rotateModel(rotatex, rotatexState, cg.mRotateX);
      rotatey = rotateModel(rotatey, rotateyState, cg.mRotateY);

      vm  = viewMatrix;
      vmi = cg.mInverse(vm);

      if (videoHandTracker && ! window.vr)
         videoHandTracker.update();

      g2.update();
   }

   // FIND OUT WHETHER THE MODEL HAS A PARTICULAR NAMED PART

   let hasPart = partName => {
      for (let i = 0 ; i < S.length ; i++)
         if (S[i].name === partName)
            return true;
      return false;
   }

   let isDraggingFromCenter = false;

   let I = n => S[n].symmetry==2 ? n-1 : n;
   
   let transform = (n, dx, dy, dz) => {
      isDraggingFromCenter = isPressed && S[n].symmetry == 0;
      if (isDraggingFromCenter)
         for (let i = 0 ; i < S.length ; i++) {
             S[i].saveSymmetry = S[i].symmetry;
             S[i].symmetry = 0;
         }
      transform2(n, dx, dy, dz);
      if (isDraggingFromCenter)
         for (let i = 0 ; i < S.length ; i++) {
            S[i].symmetry = S[i].saveSymmetry;
            delete S[i].saveSymmetry;
         }
   }
   let transform2 = (n, dx, dy, dz) => {
      let sym = S[n].symmetry ? 1 : 0;
      for (let i = 0 ; i <= sym ; i++) {
         let sgn = isScaling || isUniformScaling || i == 0 ? 1 : -1;
         if (! isScaling && ! isUniformScaling && I(n) == n-1) sgn *= -1;
         let r = rotateyState % 2;
         let sx = ! isRotating || i==0 ? 1 : -1;
         transformBlob(I(n)+i, r ?  sx*dx : dx*sgn,
                               r ?  sx*dy : dy,
                               r ? sgn*dz : dz);
      }
   }

   let nameBipedParts = () => {
      for (let i = 0 ; i < S.length ; i++)
         if (S[i].name == 'right_foot') {
            for (let n = 0 ; n < S.length ; n++) {
               let s = S[n], m = s.symmetry;
               if (isChildOf(s, 'chest')) s.name = m==0 ? 'head' : m==1 ? 'right_upper_arm' : 'left_upper_arm';
               if (isChildOf(s, 'left_upper_arm' )) s.name = 'left_lower_arm' ;
               if (isChildOf(s, 'right_upper_arm')) s.name = 'right_lower_arm';
               if (isChildOf(s, 'left_upper_arm' )) s.name = 'left_lower_arm' ;
               if (isChildOf(s, 'right_lower_arm')) s.name = 'right_hand';
               if (isChildOf(s, 'left_lower_arm' )) s.name = 'left_hand' ;
            }
            return;
         }

      S[0].name = 'belly';
      for (let n = 1 ; n < S.length ; n++) {
         let s = S[n], m = s.symmetry;
         if      (isChildOf(s, 'belly')) s.name = m==0 ? 'chest' : m==1 ? n<3 ? 'right_eye' : 'right_upper_leg' :
                                                                          n<3 ? 'left_eye'  : 'left_upper_leg'  ;
         else if (isChildOf(s, 'chest')) s.name = m==0 ? 'head'  : m==1 ? 'right_upper_arm' : 'left_upper_arm'  ;
         else if (isChildOf(s, 'head' )) s.name = m==0 ? 'nose'  : m==1 ? 'right_eye'       : 'left_eye'        ;
         else if (isChildOf(s, 'right_upper_leg')) s.name = 'right_lower_leg';
         else if (isChildOf(s, 'right_lower_leg')) s.name = 'right_foot'     ;
         else if (isChildOf(s, 'right_upper_arm')) s.name = 'right_lower_arm';
         else if (isChildOf(s, 'right_lower_arm')) s.name = 'right_hand'     ;
         else if (isChildOf(s, 'left_upper_leg' )) s.name = 'left_lower_leg' ;
         else if (isChildOf(s, 'left_lower_leg' )) s.name = 'left_foot'      ;
         else if (isChildOf(s, 'left_upper_arm' )) s.name = 'left_lower_arm' ;
         else if (isChildOf(s, 'left_lower_arm' )) s.name = 'left_hand'      ;
      }
   }

   // INTERACTION TO CREATE A NEW BLOB

   let createBegin = (x,y) => {
      mn = S.length;
      S.push({
         A: [x,y,0],
         B: [x+.01,y+.01,0],
         blur: 0.5,
         color: defaultColor,
         id: cg.uniqueID(),
         isBlobby: true,
         isColored: false,
         rounded: false,
         sign: 1,
         symmetry: 0,
         texture: '',
      });
      computeMatrix(S[mn]);
      xPrev = x;
      yPrev = y;
   }

   let createDrag = (x,y) => {
      activeSet(true);
      let s = S[mn];

      if (!s || ! s.B) {
         mn = -1;
         keyChar = null;
         return;
      }

      s.B[0] = x;
      s.B[1] = y;
      let rz = Math.max(rMin, Math.min(Math.abs(s.A[0] - s.B[0]),
                                       Math.abs(s.A[1] - s.B[1])) / 2);
      s.A[2] = -rz;
      s.B[2] = +rz;

      computeMatrix(s);
      xyTravel += Math.abs(x - xPrev) + Math.abs(y - yPrev);
      xPrev = x;
      yPrev = y;
   }

   let createEnd = () => {
      if (isCentering && S[mn].A[0] * S[mn].B[0] < 0) {
         S[mn].M[12] = 0;
         computeQuadric(S[mn]);
      }
      handleJoint(mn);
      isCreating = false;
      mn = -1;
      if (isMirroring)
         mirror();
   }

   let deleteSelectedBlob = () => {
      if (S.length > 0) {               // DELETE A BLOB
         let n = ns(), sym = S[n].symmetry;
         if (sym == 1) deleteBlob(n+1);
                       deleteBlob(n);
         if (sym == 2) deleteBlob(n-1);
      }
   }

   // HELPER FUNCTIONS FOR RESPONDING TO MOUSE/CURSOR EVENTS

   let handleJoint = nn => {
      if (nn >= 1) {
         let intersection = (a,b) => {
            return [ [ Math.max(a[0][0],b[0][0]), Math.min(a[0][1],b[0][1]) ],
                     [ Math.max(a[1][0],b[1][0]), Math.min(a[1][1],b[1][1]) ],
                     [ Math.max(a[2][0],b[2][0]), Math.min(a[2][1],b[2][1]) ] ];
         }
         let computeJointPosition = (s, I) =>
            s.jointPosition = matrix_transform(matrix_inverse(s.M), [ (I[0][0] + I[0][1]) / 2,
                                                                      (I[1][0] + I[1][1]) / 2,
                                                                      (I[2][0] + I[2][1]) / 2 ]);

         if (S[nn].parentID) {                          // REPOSITION EXISTING JOINT
            let b = implicitSurface.bounds();
            let n = findBlobIndex(parent(S[nn]));
            if (n >= 0) {
               let I = intersection(b[n], b[nn]);
               computeJointPosition(S[nn], I);
               if (S[nn].symmetry) {
                  let nn2 = S[nn].symmetry==1 ? nn+1 : nn-1;
                  let n2 = findBlobIndex(parent(S[nn2]));
                  let I = intersection(b[n2], b[nn2]);
                  computeJointPosition(S[nn2], I);
               }
            }
         }
         else {                                         // CREATE NEW JOINT
            let b = implicitSurface.bounds();
            for (let n = 0 ; n < b.length ; n++) {
               if (n != nn) {
                  let I = intersection(b[nn], b[n]);
                  if ( I[0][0] < I[0][1] &&
                       I[1][0] < I[1][1] &&
                       I[2][0] < I[2][1] ) {
                     S[nn].parentID = S[n].id;
                     computeJointPosition(S[nn], I);
                     S[nn].jointRotation = matrix_identity();
                     if (S[nn].symmetry)
                        createMirrorJoint(nn);
                     break;
                  }
               }
            }
            nameBipedParts();
         }
      }
   }

   let mirror = () => {
         if (S.length > 0) {                   // CHANGE MIRROR SYMMETRY
            saveForUndo();
            let n1 = ns(),
                s1 = S[n1];
            switch (s1.symmetry) {
            case 0:                            // CREATE MIRROR SYMMETRY
               let d = s1.M[12] < 0 ? 1 : 0;
               s1.symmetry = 2 - d;
               let s2 = {
                  M: s1.M.slice(),
                  color: s1.color,
                  id: cg.uniqueID(),
                  isBlobby: s1.isBlobby,
                  isColored: s1.isColored,
                  rounded: s1.rounded,
                  sign: s1.sign,
                  symmetry: 1 + d,
                  texture: s1.texture,
                  form: s1.form,
               };
               s2.M[12] = -s1.M[12];
               computeQuadric(s2);
               insertBlob(n1 + d, s2);
               if (s1.jointPosition)
                  createMirrorJoint(n1 + 1 - d);
               break;
            case 1:                            // REMOVE MIRROR SYMMETRY
               s1.symmetry = 0;
               deleteBlob(n1+1);
               break;
            case 2:
               s1.symmetry = 0;
               deleteBlob(n1-1);
               break;
            }
         }
   }

   let createMirrorJoint = n1 => {
      let n2 = S[n1].symmetry==1 ? n1+1 : n1-1,
          s1 = S[n1],
          s2 = S[n2];
      s2.jointPosition = [-s1.jointPosition[0],
                           s1.jointPosition[1],
                           s1.jointPosition[2]];
      s2.parentID = s1.parentID;
      s2.jointRotation = matrix_identity();
      if (parent(s1) && parent(s1).symmetry) {
         let n = findBlobIndex(parent(s1));
         n += parent(s1).symmetry == 1 ? 1 : -1;
         s2.parentID = S[n].id;
      }
   }

   let setDepthToMaxOfWidthAndHeight = s => {
      let M = s.M;
      let x = cg.norm(M.slice(0, 3));
      let y = cg.norm(M.slice(4, 7));
      let z = cg.norm(M.slice(8,11));
      s.M = matrix_multiply(M, matrix_scale(1, 1, Math.max(x,y)/z));
   }

   // RESPOND TO MOUSE/CURSOR EVENTS

   canvas.onPress = (x,y) => {
      isPressed = true;
      xyTravel = 0;
   }

   canvas.onDrag = (x,y) => {
      if (mn >= 0) {
         if (isLengthening) {
            let isTranslatingSave = isTranslating;
            let isScalingSave = isScaling;

            isTranslating = false;
            isScaling = true;
            transform(mn, 0, 0, y - yPrev);

            isTranslating = isTranslatingSave;
            isScaling = isScalingSave;
         }
         else
            transform(mn, x - xPrev, y - yPrev, 0);
      }

      xyTravel += Math.abs(x - xPrev) + Math.abs(y - yPrev);
      xPrev = x;
      yPrev = y;
   }
   
   canvas.onRelease = (x,y) => {
      isPressed = false;
      switch (keyChar) {
      case 'A':
      case 'B':
      case 'D':
      case 'X':
      case 'Y':
      case 'Z':
         createEnd();                      // ADD A BLOB
         break;

      case 'L':
         isLengthening = false;
         break;

      case 'R':
      case 'S':
      case 'T':
      case 'U':
         isRotating = isScaling = isTranslating = isUniformScaling = false;
         if (mn >= 0 && keyChar == 'T') {
            handleJoint(mn);
            for (let n = 0 ; n < S.length ; n++)
               if (S[n].parentID == S[mn].id)
                  handleJoint(n);
         }
         activeSet(false);
         break;
      }
      keyChar = null;
   }

   canvas.onMove = (x,y) => {
      if (isModeler && model._children.length > 0)
         return;

      if (isCreating)
         createDrag(x, y);
      else if (mn >= 0 && (isRotating || isScaling || isTranslating || isUniformScaling))
         transform(mn, x - xPrev, y - yPrev, 0);
      else if (mn >= 0 && isLengthening) {
         isTranslating = true;
         transform(mn, 0, 0, y - yPrev);
         isTranslating = false;
         isScaling = true;
         transform(mn, 0, 0, y - yPrev);
         handleJoint(mn);
         isScaling = false;
      }
      else
         findActiveBlob(x, y);

      xPrev = x;
      yPrev = y;
   }
   
   // RESPOND TO THE KEYBOARD

   canvas.onKeyPress = (key, event) => {
      if (!justPressed && ! isShowingCode && window.interactMode == 1) {
         justPressed = true;
         this.onKeyDown(key, event);
      }
   }

   this.onKeyDown = (key, event) => {

      if (key != keyPressed) {
         switch (key) {
         case 16:
            isShift = true;
            return;
         case 17:
            isControl = true;
            return;
         case 18:
            isAlt = true;
            return;
         case 189: // '-'
            if (isRubber)
               flash = true;
            return;
         }

         if (isControl)
            return;

         if (! enableModeling && model.onKeyDown)
            model.onKeyDown(event.key);

         if (! enableModeling)
        return;

         //---- EVERYTHING BELOW IS IS FOR KEY RESPONSES IN THE INTERACTIVE CLAY MODELER

         switch (String.fromCharCode(key)) {
         case 'A':
         case 'B':
         case 'D':
         case 'X':
         case 'Y':
         case 'Z':
            if (isRubber)
               flash = true;
            break;
         }
      }
      keyPressed = key;
   }

   let ns = () => mn >= 0 ? mn : S.length - 1;

   canvas.onKeyRelease = (key, event) => {
      if (justPressed && ! isShowingCode && window.interactMode == 1) {
         this.onKeyUp(key, event);
         justPressed = false;
      }
   }

   this.onKeyUp = (key, event) => {

      flash = false;
      keyPressed = -1;

      isRotating = isScaling = isTranslating = isUniformScaling = false;
      let ch = String.fromCharCode(key);
      keyChar = ch;

      if (event.ctrlKey)
         model._doControlAction(event.key);

      isControl = false;

      // USE SHIFT + ARROW KEY TO ROTATE THE VIEW OF THE MODEL

      if (isShift)
         switch (key) {
         case 37: rotateyState--; return; // LEFT  ARROW ROTATES LEFT
         case 38: rotatexState++; return; // UP    ARROW ROTATES UP
         case 39: rotateyState++; return; // RIGHT ARROW ROTATES RIGHT
         case 40: rotatexState--; return; // DOWN  ARROW ROTATES DOWN
         }

      if (! enableModeling && ! event.ctrlKey) {
         model.keyQueue.push(event.key);
     if (model.onKeyUp)
            model.onKeyUp(ch);
      }

      if (! enableModeling)
         return;

      //---- EVERYTHING BELOW IS IS FOR KEY RESPONSES IN THE INTERACTIVE CLAY MODELER

      // TYPE 0-9 TO SET BLOB COLOR

      if (S.length > 0 && ch >= '0' && ch <= '9') {
         saveForUndo();
         let color = 'color' + (key - 48) + (isLightColor ? 'l' : '');

         // SET COLOR OVER BACKGROUND TO COLOR ALL UNCOLORED BLOBS.

         if (mn < 0) {
            defaultColor = color;
            for (let n = 0 ; n < S.length ; n++)
               if (! S[n].isColored)
                  S[n].color = defaultColor;
         }

         // SET COLOR OVER A BLOB TO EXPLICITLY COLOR IT.

         else {
            let sym = S[ns()].symmetry ? 1 : 0;
            for (let i = 0 ; i <= sym ; i++) {
               S[I(ns())+i].color = color;
               S[I(ns())+i].isColored = true;
            }
         }

         isLightColor = false;
         return;
      }

      switch (key) {
      case 8: // DELETE
         if (isRubber)
            break;
         if (S.length > 0) {
            saveForUndo();
            deleteSelectedBlob();            // DELETE THE SELECTED BLOB
         }
         break;
      case 16:
         isShift = false;
         break;
      case 17:
         isControl = false;
         break;
      case 18:
         modelMatrix = matrix_translate(0,0,0);
         mn = findBlob(xPrev, yPrev);
         isAlt = false;
         break;
      case 27:
         this.setShowingCode(true);          // ESC TO SHOW/HIDE CODE EDITOR
         break;
      case 187: // '='
         if (S.length > 0) {
            saveForUndo();
            let sym = S[ns()].symmetry ? 1 : 0;
            for (let i = 0 ; i <= sym ; i++)
               setDepthToMaxOfWidthAndHeight(S[I(ns())+i]);
            activeSet(true);
         }
         return;
      case 189: // '-'
         if (isRubber)
            break;
         if (S.length > 0) {               // MAKE NEGATIVE
            saveForUndo();
            let sym = S[ns()].symmetry ? 1 : 0;
            for (let i = 0 ; i <= sym ; i++)
               S[I(ns())+i].sign = -S[I(ns())+i].sign;
            activeSet(true);
         }
         break;
      case 190: // '.'
         if (S.length > 0) {               // TOGGLE IS BLOBBY
            saveForUndo();
            let sym = S[ns()].symmetry ? 1 : 0;
            for (let i = 0 ; i <= sym ; i++)
               S[I(ns())+i].isBlobby = ! S[I(ns())+i].isBlobby;
            activeSet(true);
         }
         break;
      case 191: // '/'
         isRubber = ! isRubber;
         break;
      case 192: // '`'
         isLightColor = ! isLightColor;    // LIGHT COLOR
         break;
      case 219: // '['
         saveForUndo();
         if (S.length > 0) {
            isTranslating = true;
            transform(ns(), 0,0,-.05);     // AWAY
            isTranslating = false;
         }
         break;
      case 220: // '\'
         saveForUndo();
         isCentering     = false;
         isMirroring     = false;
         isRubber        = false;
         isShowingJoints = false;
         isWalking       = false;
         isWiggling      = false;
         textureState      = 0;
         rotatexState    = 0;
         rotateyState    = 0;
         S = [];                           // DELETE ALL BLOBS
         mn = -1;
         activeSet(true);
         break;
      case 221: // ']'
         saveForUndo();
         if (S.length > 0) {
            isTranslating = true;
            transform(ns(), 0,0,.05);      // FORWARD
            isTranslating = false;
         }
         break;
      }

      if (isControl) {
         switch (ch) {
         case 'Y':
            redo();
            break;
         case 'Z':
            undo();
            break;
         default:
            model._doControlAction(ch);
            break;
         }
         return;
      }

      if (isShift) {
         switch (ch) {
         case 'B':
            isShowingBounds = ! isShowingBounds;
            break;
         case 'E':
            displacementTextureType = (displacementTextureType + 1) % 3;
            activeSet(true);
            break;
         case 'F':
            isFewerDivs = ! isFewerDivs;
            break;
         case 'I':
            isTextureSrc = ! isTextureSrc;
            break;
         case 'M':
            isModeler = ! isModeler;
            if (! isModeler) {
               S = [];
               initMaterials();
               frameCount = 0;
            }
            else
               activeSet(true);
            break;
         case 'N':
            isFaceted = ! isFaceted;
            break;
         case 'Q':
            console.log(JSON.stringify(saveFunction()));
            break;
         case 'T':
            isTexture = ! isTexture;
            this.setShowingCode(isShowingCode);
            isNewTextureCode = true;
            break;
         case 'V':
            isRotatedView = ! isRotatedView;
            break;
         case 'X':
            isExperiment = true;
            break;
         }
         return;
      }

      switch (ch) {
      case 'A':
      case 'B':
      case 'D':
      case 'X':
      case 'Y':
      case 'Z':
         if (! isRubber && ! isCreating) {
            saveForUndo();
            createBegin(xPrev, yPrev);
            if (ch == 'A') S[mn].form = 'sphere';
            if (ch == 'B') S[mn].form = 'cube';
            if (ch == 'D') S[mn].form = 'donut';
            if (ch == 'X') S[mn].form = 'tubeX';
            if (ch == 'Y') S[mn].form = 'tubeY';
            if (ch == 'Z') S[mn].form = 'tubeZ';
            isCreating = true;
         }
         break;

      case 'C':
         if (mn >= 0 && S[mn] && S[mn].M) {
            saveForUndo();
            S[mn].M[12] = 0;                    // CENTER BLOB AT CURSOR
            computeQuadric(S[mn]);
         }
         else                                   // BUT IF OVER BACKGROUND
            isCentering = ! isCentering;        // TOGGLE CENTERING MODE
         break;
      case 'F':
         textureState = textureState == 4 ? 0 : 4;
         break;
      case 'G':
         isWalking = ! isWalking;
         break;
      case 'H':
         textureState = textureState == 5 ? 0 : 5;
         break;
      case 'I':
         // html.helpWindow1.style.zIndex = 1 - html.helpWindow1.style.zIndex;
         // html.helpWindow2.style.zIndex = 1 - html.helpWindow2.style.zIndex;
         break;
      case 'J':
         isShowingJoints = ! isShowingJoints;
         break;
      case 'K':
         if (S.length > 0) {                    // BLUR EDGES
            saveForUndo();
            S[ns()].rounded = ! S[ns()].rounded;
            activeSet(true);
         }
         break;
      case 'L':
         isLengthening = true;
         break;
      case 'M':
         isMirroring = ! isMirroring;
         break;
      case 'N':
         textureState = textureState == 1 ? 0 : 1;
         break;
      case 'O':
         // if (isShift)
         //    projectManager.clearAll();        // CLEAR ALL PROJECT DATA
         // else
         //    projectManager.clearNames();      // CLEAR PROJECT NAMES
         activeSet(true);
         break;
      case 'P':
         projectManager.choice(loadFunction); // USER CHOOSES PROJECT
         break;
      case 'Q':
         textureState = textureState == 2 ? 0 : 2;
         break;
      case 'R':
         saveForUndo();
         isRotating = true;
         break;
      case 'S':
         saveForUndo();
         isScaling = true;
         break;
      case 'T':
         saveForUndo();
         isTranslating = true;
         break;
      case 'U':
         saveForUndo();
         isUniformScaling = true;
         break;
      case 'V':
         textureState = textureState == 3 ? 0 : 3;
         break;
      case 'W':
         isWiggling = ! isWiggling;
         break;
      }
   }

// PREDEFINED PROCEDURAL TEXTURES

let textureIndex = 0;

let textures = [
``
,
`// NOISE

density += 2 * cg.noise(7*x,7*y,7*z + time) - 1`
,
`// SUBTLE NOISE

density += .5 * (cg.noise(7*x,7*y,7*z + time) - .3)`
,
`// ERODED

for (let s = 4 ; s < 16 ; s *= 2) {
   let u = max(0, cg.noise(density*7*x,
                        density*7*y,
                        density*7*z));
   density -= 16 * u * u / s;
}`    
,
`// LEAFY

f = 7;
for (let s = 4*f ; s < 64*f ; s *= 2)
   density += (cg.noise(s*x,s*y,s*z) - .3)  * f/s;` 
,
`// ROCK

for (let s = 3 ; s < 100 ; s *= 2)
   density += (cg.noise(s*x,s*y,s*z) - .3) / s;`
];    
   
}