"use strict";

import * as cg from "../render/core/cg.js";
import { lcb, rcb } from "../handle_scenes.js";

// SUPPORT LIBRARY FOR 2D GRAPHICS

export function G2(do_not_animate_flag=false, canvasWidth=512, canvasHeight) {

   let g2 = this;

   let txtrCanvas = document.createElement('canvas');
   txtrCanvas.width = canvasWidth;
   txtrCanvas.height = canvasHeight===undefined ? canvasWidth : canvasHeight;
   txtrCanvas._animate = ! do_not_animate_flag;

   let context = txtrCanvas.getContext('2d');
   let width   = txtrCanvas.width;
   let height  = txtrCanvas.height;
   txtrCanvas.context = context;

   let mouseZPrev = false;
   let mouseState = 'move';

   // CONVERT COORDS [-1 ... +1] x [-1 ... +1] <=> [0 ... width] x [0 ... height]

   let x2c = x => width * (.5 * x + .5);
   let y2c = y => height * (1 - (.5 * y + .5));
   let w2c = w => width * (.5 * w);
   let h2c = h => height * (.5 * h);
   let c2w = w => (2 * w) / width;

   let i2c = i => ('0123456789abcdef').substring(i,i+1);
   let i2h = i => i2c(i >> 4) + i2c(i % 15);
   let f2h = f => i2h(255*Math.min(1,f));
   let rgbaToHex = (r,g,b,a) => '#' + f2h(r) + f2h(g) + f2h(b) + (a===undefined ? '' : f2h(a));

   let isRgba = arg => Array.isArray(arg);
   let isHex = arg => typeof arg === 'string' && arg.charAt(0) == '#';
   let c2i = c => c < 65 ? c - 48 : c < 65 ? c - 55 : c - 87;
   let h2f = h => c2i(h.charCodeAt(0)) / 16 + c2i(h.charCodeAt(1)) / 256;
   let hexToRgba = hex => [ h2f(hex.substring(1,3)), h2f(hex.substring(3,5)), h2f(hex.substring(5,7)),
                            hex.length > 8 ? h2f(hex.substring(7,9)) : 1 ];

   let textWidth = text => context.measureText(text).width / width;

   context.lineCap = 'round';

   let widgets = [];

   this.getCanvas = () => txtrCanvas;

   this.setAnimate = true_or_false => { txtrCanvas._animate = true_or_false; return this; }

   this.addWidget = (obj, type, x, y, color, label, action, size) => {
      switch (type) {
      case 'button'  : widgets.push(new Button  (obj, x, y, color, label, action, size)); break;
      case 'slider'  : widgets.push(new Slider  (obj, x, y, color, label, action, size)); break;
      case 'textbox' : widgets.push(new Textbox (obj, x, y, color, label, action, size)); break;
      case 'trackpad': widgets.push(new Trackpad(obj, x, y, color, label, action, size)); break;
      }
      return widgets[widgets.length - 1];
   }

   this.getUVZ = obj => this.computeUVZ(obj.getGlobalMatrix());

   let activeWidget = null;

   this.update = () => {
      if (window.vr)
         mouseZ = (lcb && lcb.down) || (rcb && rcb.down);
      mouseState = ! mouseZPrev && mouseZ ? 'press' :
                   ! mouseZ && mouseZPrev ? 'release' : mouseZ ? 'drag' : 'move';
      mouseZPrev = mouseZ;

      if (mouseState == 'press') {
         activeWidget = null;
         let nearestZ = 100000;
         for (let n = 0 ; n < widgets.length ; n++)
            if (widgets[n].isWithin()) {
               let uvz = this.getUVZ(widgets[n].obj);
               if (uvz && uvz[2] < nearestZ) {
                  activeWidget = widgets[n];
                  nearestZ = uvz[2];
               }
            }
      }
      if (activeWidget && activeWidget.handleEvent && mouseState != 'move')
         activeWidget.handleEvent();
      if (activeWidget && activeWidget.handleKeyEvent)
         activeWidget.handleKeyEvent();

      if (txtrCanvas._animate || renderCount++ == 0) {
         this.clear();
         this.render();
      }

      return this.drawWidgets();
   }

   let renderCount = 0;

   this.isActiveWidget = () => activeWidget != null;
   
   this.render = () => {}

   this.drawWidgets = () => {
      for (let n = 0 ; n < widgets.length ; n++)
         widgets[n].draw();
      return activeWidget != null;
   }

   let drawWidgetOutline = (x,y,w,h,isPressed) => {
      let s = .007;
      g2.setColor(isPressed ? 'black' : '#a0a0a0');
      g2.fillRect(x-w/2-s, y-h/2, s, h+s);
      g2.fillRect(x-w/2-s, y+h/2, w+s+s, s);
      g2.setColor(isPressed ? '#a0a0a0' : 'black');
      g2.fillRect(x-w/2-s, y-h/2, w+s+s, s);
      g2.fillRect(x+w/2, y-h/2+s, s, h);
   }

   let Button = function(obj, x, y, color, label, action, size) {
      size = cg.def(size, 1);
      this.obj = obj;
      this.state = 0;
      g2.textHeight(.09 * size);
      let w = textWidth(label) + .02 * size, h = .1 * size;
      this.setLabel = str => label = str;
      this.isWithin = () => {
         let uvz = g2.getUVZ(obj);
         return uvz && uvz[0] > x-w/2 && uvz[0] < x+w/2 && uvz[1] > y-h/2 && uvz[1] < y+h/2;
      }
      this.handleEvent = () => {
         if (action && mouseState == 'release' && this.isWithin()) {
            action();
            activeWidget = null;
            if (Array.isArray(label))
               this.state = (this.state + 1) % label.length;
         }
      }
      this.draw = () => {
         let isPressed = this == activeWidget && (mouseState == 'press' || mouseState == 'drag');
         g2.textHeight(.045 * size);
         g2.setColor(color, isPressed ? .5 : this.isWithin() ? .7 : 1);
         g2.fillRect(x-w/2, y-h/2, w, h);
         g2.setColor('black');
         g2.text(Array.isArray(label) ? label[this.state] : label, x, y, 'center');
         drawWidgetOutline(x,y,w,h, isPressed);
      }
   }

   let Slider = function(obj, x, y, color, label, action, size) {
      size = cg.def(size, 1);
      this.obj = obj;
      let value = 0.5;
      let w = .5 * size, h = .1 * size;
      this.setLabel = str => label = str;
      this.isWithin = () => {
         let uvz = g2.getUVZ(obj);
         return uvz && uvz[0] > x-w/2 && uvz[0] < x+w/2 && uvz[1] > y-h/2 && uvz[1] < y+h/2;
      }
      this.setValue = v => value = v;
      this.handleEvent = () => {
         let uvz = g2.getUVZ(obj);
         if (uvz) {
            value = Math.max(0, Math.min(1, (uvz[0] - (x-w/2)) / w));
            if (action && mouseState == 'drag')
               action(value);
         }
      }
      this.draw = () => {
         g2.textHeight(.09 * size);
         let isPressed = this == activeWidget && (mouseState == 'press' || mouseState == 'drag');
         g2.setColor(color, isPressed ? .75 : this.isWithin() ? .85 : 1);
         g2.fillRect(x-w/2, y-h/2, w, h);
         g2.setColor(color, isPressed ? .375 : this.isWithin() ? .475 : .5);
         g2.fillRect(x-w/2, y-h/2, w * value, h);
         g2.setColor('black');
         g2.textHeight(.045 * size);
         g2.text(label, x, y, 'center');
         drawWidgetOutline(x,y,w,h, isPressed);
      }
   }

   let Textbox = function(obj, x, y, color, text, action, size) {
      size = cg.def(size, 1);
      this.obj = obj;
      let model = obj;
      let cursor = text.length;
      while (model._parent._parent)
         model = model._parent;
      let w = .9 * size, h = .1 * size;
      this.isWithin = () => {
         let uvz = g2.getUVZ(obj);
         return uvz && uvz[0] > x-w/2 && uvz[0] < x+w/2 && uvz[1] > y-h/2 && uvz[1] < y+h/2;
      }
      this.handleEvent = () => {
         let uvz = g2.getUVZ(obj);
         if (uvz) {
            cursor = (uvz[0] - x) / (.053 * size) + text.length/2;
            cursor = Math.max(0, Math.min(text.length, cursor + .5 >> 0));
         }
      }
      this.handleKeyEvent = () => {
         let key;
         while (model.keyQueue.length > 0) {
            switch (key = model.keyQueue.shift()) {
            case 'ArrowLeft' :
               cursor = Math.max(cursor - 1, 0);
               break;
            case 'ArrowRight':
               cursor = Math.min(cursor + 1, text.length);
               break;
            case 'Backspace':
               text = text.substring(0, cursor - 1) + text.substring(cursor, text.length);
               cursor--;
               break;
            default:
               if (key.length == 1) {
                  text = text.substring(0, cursor) + key + text.substring(cursor, text.length);
                  cursor++;
               }
               break;
            }
         }
         if (action)
            action(text);
      }
      this.draw = () => {
         context.save();
         context.font = (height * .07 * size) + 'px ' + font;
         g2.setColor(color, this.isWithin() ? .7 : 1);
         g2.fillRect(x-w/2, y-h/2, w, h);
         g2.setColor('black');
         g2.text(text, x, y, 'center');
         if (this == activeWidget) { // IF THIS IS THE ACTIVE WIDGET, THEN DRAW THE CURSOR.
            let cx = x + .053 * size * (cursor - text.length/2);
            g2.fillRect(cx - .005 * size, y - h/2, .01 * size, h);
         }
         drawWidgetOutline(x,y,w,h, true);
         context.restore();
      }
   }

   let Trackpad = function(obj, x, y, color, label, action, size) {
      size = cg.def(size, 1);
      this.obj = obj;
      let value = [0.5, 0.5];
      let w = .5 * size, h = .5 * size;
      this.isWithin = () => {
         let uvz = g2.getUVZ(obj);
         return uvz && uvz[0] > x-w/2 && uvz[0] < x+w/2 && uvz[1] > y-h/2 && uvz[1] < y+h/2;
      }
      this.handleEvent = () => {
         let uvz = g2.getUVZ(obj);
         if (uvz) {
            value[0] = Math.max(0, Math.min(1, (uvz[0] - (x-w/2)) / w));
            value[1] = Math.max(0, Math.min(1, (uvz[1] - (y-h/2)) / h));
            if (action && mouseState == 'drag')
               action(value);
         }
      }
      this.draw = () => {
         g2.textHeight(.09 * size);
         let isPressed = this == activeWidget && (mouseState == 'press' || mouseState == 'drag');
         g2.setColor(color, isPressed ? .75 : this.isWithin() ? .85 : 1);
         g2.fillRect(x-w/2, y-h/2, w, h);
         g2.setColor(color, isPressed ? .375 : this.isWithin() ? .475 : .5);
         g2.setColor('#00000080');
         g2.fillRect(x-w/2 + w*value[0] - .005 * size, y-h/2, .01 * size, h);
         g2.fillRect(x-w/2, y-h/2 + h*value[1] - .005 * size, w, .01 * size);
         g2.setColor('black');
         g2.text(label, x, y + .7 * w, 'center');
         drawWidgetOutline(x,y,w,h, isPressed);
      }
   }

   let sCurve = t => t * t * (3 - t - t);
   let lerp = (t,a,b) => a + t * (b - a);
   let noise2P = [], noise2U = [], noise2V = [];
   let noise2 = (x, y) => {
      if (noise2P.length == 0) {
         let p = noise2P, u = noise2U, v = noise2V, i, j;
         for (i = 0 ; i < 256 ; i++) {
            p[i] = i;
            u[i] = 2 * Math.random() - 1;
            v[i] = 2 * Math.random() - 1;
            let s = Math.sqrt(u[i]*u[i] + v[i]*v[i]);
            u[i] /= s;
            v[i] /= s;
         }
         while (--i) {
            let k = p[i];
            p[i] = p[j = Math.floor(256 * Math.random())];
            p[j] = k;
         }
         for (i = 0 ; i < 256 + 2 ; i++) {
            p[256 + i] = p[i];
            u[256 + i] = u[i];
            v[256 + i] = v[i];
         }
      }
      let P = noise2P, U = noise2U, V = noise2V;
      x = (x + 4096) % 256;
      y = (y + 4096) % 256;
      let i = Math.floor(x), u = x - i, s = sCurve(u);
      let j = Math.floor(y), v = y - j, t = sCurve(v);
      let a = P[P[i] + j  ], b = P[P[i+1] + j  ];
      let c = P[P[i] + j+1], d = P[P[i+1] + j+1];
      return lerp(t, lerp(s, u*U[a] +  v   *V[a], (u-1)*U[b] +  v   *V[b]),
                     lerp(s, u*U[c] + (v-1)*V[c], (u-1)*U[d] + (v-1)*V[d]));
   }
   let isNoise = false;
   let _nF = 0.025, _nA = 3;
   let _noise = (x,y) => noise2(1.2*x,1.2*y) + 0.5 * noise2(0.6*x,0.6*y);
   let noiseX = (x,y) => x + _nA * _noise(_nF*x, _nF*y);
   let noiseY = (x,y) => y + _nA * _noise(_nF*x, _nF*(y+128));
   let _mx, _my;

   this.noise = flag => isNoise = flag;

   let moveTo = (x,y) => {
      if (! isNoise)
         context.moveTo(x,y);
      else {
         context.moveTo(noiseX(x,y),noiseY(x,y));
         _mx = x;
         _my = y;
      }
   }

   let lineTo = (x,y) => {
      if (! isNoise)
         context.lineTo(x,y);
      else {
         let dx = x-_mx;
         let dy = y-_my;
         let d = Math.sqrt(dx*dx + dy*dy);
         for (let i = 10 ; i < d ; i += 10) {
            let xx = lerp(i/d, _mx, x);
            let yy = lerp(i/d, _my, y);
            context.lineTo(noiseX(xx,yy), noiseY(xx,yy));
         }
         context.lineTo(noiseX(x,y), noiseY(x,y));
         _mx = x;
         _my = y;
      }
   }

   this.arrow = (a,b) => {
      this.drawPath([a,b]);
      let r = c2w(context.lineWidth);
      let d = cg.normalize([b[0]-a[0],b[1]-a[1],0]);
      this.fillPath([ [b[0]+2*d[0]*r, b[1]+2*d[1]*r],
                      [b[0]-d[0]*r-2*d[1]*r, b[1]-d[1]*r+2*d[0]*r],
                      [b[0]-d[0]*r+2*d[1]*r, b[1]-d[1]*r-2*d[0]*r] ]);
      return this;
   }
   this.clear = () => {
      context.clearRect(0, 0, width, height);
      return this;
   }
   this.computeUVZ = objMatrix => {
      if (! window.vr) {
         let w = screen.width, h = screen.height;
         return cg.mHitRect(cg.mMultiply(cg.mInverse(views[0].viewMatrix),
                                         cg.mAimZ([.965*(1-mouseX/(w/2)),
                                                   .965*(mouseY/(w/2)-h/w),5])), objMatrix);
      }
      else {
         let L = lcb.hitRect(objMatrix);
         let R = rcb.hitRect(objMatrix);
         return L ? L : R ? R : null;
      }
   }

   this.drawImage = (image,x,y,w,h,rotation, sx,sy,sw,sh) => {
      context.save();
         context.translate(x2c(x), y2c(y));
         if (rotation)
            context.rotate(-Math.PI/2 * rotation);
         if (sx)
            context.drawImage(image, sx,sy,sw,sh, w2c(-w/2), h2c(-h/2), w2c(w), h2c(h));
         else {
            context.drawImage(image, w2c(-w/2), h2c(-h/2), w2c(w), h2c(h));
         }
      context.restore();
      return this;
   }
   this.drawOval = (x,y,w,h) => {
      context.beginPath();
      context.ellipse(x2c(x), y2c(y), w2c(w/2), h2c(h/2), 0, 0, 2 * Math.PI);
      context.stroke();
      return this;
   }
   this.drawPath = path => {
      context.beginPath();
      for (let n = 0 ; n < path.length-1 ; n++) {
         moveTo(x2c(path[n][0]), y2c(path[n][1]));
         lineTo(x2c(path[n+1][0]), y2c(path[n+1][1]));
      }
      context.stroke();
      return this;
   }
   this.drawRect = (x,y,w,h,r) => {
      if (r === undefined) {
         context.beginPath();
         context.moveTo(x2c(x  ), y2c(y  ));
         context.lineTo(x2c(x+w), y2c(y  ));
         context.lineTo(x2c(x+w), y2c(y+h));
         context.lineTo(x2c(x  ), y2c(y+h));
         context.moveTo(x2c(x  ), y2c(y  ));
	 context.stroke();
      }
      else {
         context.beginPath();
         context.roundRect(x2c(x),y2c(y+h),w2c(w),h2c(h),w2c(r));
         context.stroke();
      }
      return this;
   }
   this.fillOval = (x,y,w,h) => {
      context.beginPath();
      context.ellipse(x2c(x+w/2), y2c(y+h/2), w2c(w/2), h2c(h/2), 0, 0, 2 * Math.PI);
      context.fill();
      return this;
   }
   this.fillPath = path => {
      context.beginPath();
      for (let n = 0 ; n < path.length ; n++)
         if (n==0)
            moveTo(x2c(path[n][0]), y2c(path[n][1]));
         else
            lineTo(x2c(path[n][0]), y2c(path[n][1]));
      context.fill();
      return this;
   }
   this.fillRect = (x,y,w,h,r) => {
      if (r === undefined)
         context.fillRect(x2c(x),y2c(y+h),w2c(w),h2c(h));
      else {
         context.beginPath();
         context.roundRect(x2c(x),y2c(y+h),w2c(w),h2c(h),w2c(r));
         context.fill();
      }
      return this;
   }
   this.fillText = (text,x,y,alignment,rotation) => { this.text(text,x,y,alignment,rotation); return this; }
   this.getContext = () => context;
   this.line = (a,b) => {
      context.beginPath();
      moveTo(x2c(a[0]), y2c(a[1]));
      lineTo(x2c(b[0]), y2c(b[1]));
      context.stroke();
      return this;
   }
   this.lineWidth = w => { context.lineWidth = width * w; return this; }
   this.mouseState = () => mouseState;
   this.setColor = (color,dim) => {
      if (dim !== undefined && (isHex(color) || isRgba(color))) {
         let rgba = isHex(color) ? hexToRgba(color) : color;
         context.fillStyle = context.strokeStyle = rgbaToHex(dim*rgba[0],dim*rgba[1],dim*rgba[2],rgba[3]);
      }
      else
         context.fillStyle = context.strokeStyle = isRgba(color) ? rgbaToHex(color[0],color[1],color[2],color[3]) : color;
      return this;
   }
   let _h = 0.1;
   this.text = (text,x,y,alignment,rotation) => {
      if (typeof text == 'number' || typeof text == 'object')
         text = '' + text;
      let lines;
      try {
         lines = text.split('\n');
      } catch (error) { };
      if (lines === undefined)
         return this;

      context.save();
         let dy = 2 * parseFloat(context.font) / height;
         if (alignment)
            context.textAlign = alignment;

	 let dx = 0;
	 if (alignment == 'left' || alignment == 'right')
	    for (let n = 0 ; n < lines.length ; n++)
	       dx = Math.max(dx, textWidth(lines[n]));
         if (alignment == 'right')
	    dx = -dx;

         context.translate(x2c(x), y2c(y-dy/4));
         if (rotation)
            context.rotate(-Math.PI/2 * rotation);

         if (lines.length == 1)
            context.fillText(text,w2c(-dx/2),0);
	 else {
            context.translate(w2c(-dx/2), h2c(-dy*((lines.length-1)/2)));
            for (let n = 0 ; n < lines.length ; n++, y -= dy)
               context.fillText(lines[n],w2c(-dx/2),h2c(n*dy));
         }
      context.restore();
      return this;
   }
   this.textHeight = h => { _h = h; context.font = ((10 * height * h >> 0)/10) + 'px ' + font; return this; }
   this.setFont = f => { font = f; this.textHeight(_h); return this; }

   let font = 'Helvetica';

   this.barChart = (x,y,w,h, values, labels, colors) => {
      context.save();

      let uh = .25 / values.length;
      if (labels)
         this.textHeight(uh);

      for (let n = 0 ; n < values.length ; n++) {
         let u = h * (n + .5) / values.length;
         if (colors)
            this.setColor(colors[n]);
         this.fillRect(x, y+u-uh/2, w * values[n], uh);
         if (labels)
            this.fillText(labels[n], x-w/50, y+u, 'right', 0.5);
      }

      this.setColor('black');
      this.fillRect(x, y, .02, w);
      this.fillRect(x, y, w, .02);

      context.restore();
      return this;
   }

   this.clock = (x,y,w,h) => {
      context.save();
      context.translate(x2c(x),y2c(y+1));
      context.scale(w,h);
         this.setColor('black');
         this.fillOval(-1,-1,2,2);
         this.setColor('white');
         this.fillOval(-.99,-.99,1.98,1.98);
         this.setColor('black');
         let c = t => Math.cos(2 * Math.PI * t);
         let s = t => Math.sin(2 * Math.PI * t);
         this.textHeight(.1);
         for (let n = 1 ; n <= 12 ; n++)
            this.text('' + n, .86 * s(n/12), .84 * c(n/12), 'center');

         let now = new Date();
         let hour = now.getHours();
         let minute = now.getMinutes();
         let second = now.getSeconds();
         let clockHand = (w,t,r) => {
            this.lineWidth(w);
            this.arrow([0,0], [ r * s(t), r * c(t) ]);
         }
         clockHand(.042, (hour   + minute / 60) / 12, .49);
         clockHand(.027, (minute + second / 60) / 60, .64);
         clockHand(.018,           second / 60      , .84);
      context.restore();
      return this;
   }

   this.textHeight(.05);
}

export let g2 = new G2();

