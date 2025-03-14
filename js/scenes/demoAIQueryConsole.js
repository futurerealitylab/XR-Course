import { askAI } from "../util/aiquery.js";
import { G2 } from "../util/g2.js";

export const init = async model => {
   let g2 = new G2();
   model.txtrSrc(1, g2.getCanvas());
   
   let panel = model.add('cube').txtr(1);
   
   const updateCanvas = () => {
      g2.setColor('white');
      g2.fillRect(0, 0, 1, 1);
      
      g2.setColor('#3498db');
      g2.lineWidth(0.01);
      g2.drawRect(0.02, 0.02, 0.96, 0.96);
      
      g2.setColor('#2c3e50');
      g2.setFont('helvetica');
      g2.textHeight(0.06);
      g2.fillText("Open your browser's console", 0.5, 0.5, 'center');
   };
   
   const handleClick = (x, y) => {
      console.log("Trying askAI from the demo...");
      askAI("What is WebXR?").then(response => {
         console.log("Full response:", response);
      });
   };
   
   model.onPress = (p, eventType) => {
      if (eventType !== 'onPress') return;
      
      const panelMatrix = panel.getGlobalMatrix();
      const panelPosition = [panelMatrix[12], panelMatrix[13], panelMatrix[14]];
      const panelSize = [1, 0.7, 0.1];
      
      if (Math.abs(p.position[2] - panelPosition[2]) < panelSize[2] / 2 + 0.05) {
         const x = (p.position[0] - (panelPosition[0] - panelSize[0] / 2)) / panelSize[0];
         const y = (p.position[1] - (panelPosition[1] - panelSize[1] / 2)) / panelSize[1];
         
         if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
            handleClick(x, y);
         }
      }
   };
   
   console.log("🤖 Welcome to the FutureClassroom, I'm your AI teaching assistant!");
   console.log("Talk to me by typing: askAI(\"What is Perlin noise?\")");
   
   model.move(0, 1.5, 0).scale(0.5).animate(() => {
      panel.identity().scale(1, 0.7, 0.1);
      updateCanvas();
   });
} 