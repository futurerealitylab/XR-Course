import { askAI, askAIObject, askAIRoom } from "../util/aiquery.js";
import { G2 } from "../util/g2.js";

export const init = async model => {
   let g2 = new G2();
   model.txtrSrc(1, g2.getCanvas());
   model.txtrSrc(2, '../media/textures/brick.png');
   
   let panel = model.add('cube').txtr(1);
   let demoObjects = model.add();
   let isLoading = false;
   let statusMessage = "Click panel to generate objects";
   
   const updateCanvas = () => {
      g2.setColor('white');
      g2.fillRect(0, 0, 1, 1);
      
      g2.setColor('#3498db');
      g2.lineWidth(0.01);
      g2.drawRect(0.02, 0.02, 0.96, 0.96);
      
      // Title
      g2.setColor('#2c3e50');
      g2.setFont('helvetica');
      g2.textHeight(0.06);
      g2.fillText("AI WebXR Generator", 0.5, 0.15, 'center');
      
      // Status message (changes based on current action)
      g2.setColor(isLoading ? '#e74c3c' : '#2c3e50');
      g2.textHeight(0.05);
      g2.fillText(statusMessage, 0.5, 0.3, 'center');
      
      // Button 1
      g2.setColor('#27ae60');
      g2.fillRect(0.1, 0.4, 0.8, 0.15);
      g2.setColor('white');
      g2.textHeight(0.05);
      g2.fillText("Generate Object", 0.5, 0.47, 'center');
      
      // Button 2
      g2.setColor('#9b59b6');
      g2.fillRect(0.1, 0.6, 0.8, 0.15);
      g2.setColor('white');
      g2.textHeight(0.05);
      g2.fillText("Generate Room", 0.5, 0.67, 'center');
      
      // Hint
      g2.setColor('#7f8c8d');
      g2.textHeight(0.03);
      g2.fillText("Type 'createObject()' or 'askAI()' in console", 0.5, 0.85, 'center');
   };
   
   const clearDemoObjects = () => {
      // Safely remove all children
      if (demoObjects && demoObjects.children && demoObjects.children.length > 0) {
         // Make a copy of the children array because it will be modified during removal
         const childrenToRemove = [...demoObjects.children];
         for (let child of childrenToRemove) {
            child.remove();
         }
      }
      
      // Reset demoObjects to origin position
      demoObjects.identity();
   };
   
   const applyObjectProperties = (shape, props, options = {}) => {
      // Set default values if properties aren't provided
      const position = props.position || [0, 0, 0];  // Default to origin
      const rotation = props.rotation || [0, 0, 0];
      const scale = props.scale || [0.3, 0.3, 0.3];
      const color = props.color || [1, 0, 0];
      
      // Apply properties
      shape.move(...position);
      shape.turnX(rotation[0])
           .turnY(rotation[1])
           .turnZ(rotation[2]);
      shape.scale(...scale);
      shape.color(...color);
      
      if (props.texture) {
         shape.txtr(2); // Using brick texture for demo
      }
      
      // Optional animation - disabled by default
      if (options.animate) {
         // Add subtle animation to make it clear these are new objects
         let startTime = model.time;
         
         shape.animate(t => {
            if (model.time - startTime < 1) {
               const pulseFactor = 1 + 0.2 * Math.sin((model.time - startTime) * 10);
               shape.scale(
                  scale[0] * pulseFactor,
                  scale[1] * pulseFactor,
                  scale[2] * pulseFactor
               );
            } else {
               // After 1 second, go back to normal scale
               shape.scale(...scale);
               return true; // Stop the animation
            }
         });
      }
      
      return shape;
   };
   
   // Renders a single object with the provided properties
   const renderObject = (objectProps, options = {}) => {
      if (!objectProps) {
         console.error("❌ No object properties provided");
         return null;
      }
      
      console.log("Rendering object with properties:", objectProps);
      
      // Use the correct object type from AI response or default to sphere
      const type = objectProps.type || 'sphere';
      
      // Create the object at origin
      const shape = demoObjects.add(type);
      
      // Apply the properties
      applyObjectProperties(shape, objectProps, options);
      
      console.log("✅ Object rendered!");
      return shape;
   };
   
   // Renders an entire room from the provided layout
   const renderRoom = (roomData, options = {}) => {
      if (!roomData || !roomData.objects || !Array.isArray(roomData.objects)) {
         console.error("❌ Invalid room data:", roomData);
         return [];
      }
      
      console.log("Rendering room with", roomData.objects.length, "objects");
      
      const shapes = [];
      
      // Create each object in the room
      roomData.objects.forEach((obj, index) => {
         // Use the correct object type from AI response or default to cube
         const type = obj.type || 'cube';
         
         // Create and apply properties
         const shape = demoObjects.add(type);
         applyObjectProperties(shape, obj, options);
         shapes.push(shape);
      });
      
      console.log("✅ Room rendered with", shapes.length, "objects!");
      return shapes;
   };
   
   const generateObject = async () => {
      if (isLoading) return;
      
      isLoading = true;
      statusMessage = "Generating object...";
      
      try {
         console.log("🤖 Generating an object...");
         
         // First clear existing objects
         clearDemoObjects();
         
         const objectProps = await askAIObject("Create a colorful floating object");
         console.log("✅ Object properties received:", objectProps);
         
         statusMessage = "Object created!";
         
         // Render the object
         renderObject(objectProps);
         
         console.log("✅ Object rendered at origin!");
      } catch (error) {
         console.error("❌ Error generating object:", error);
         statusMessage = "Error: " + error.message;
      } finally {
         isLoading = false;
      }
   };
   
   const generateRoom = async () => {
      if (isLoading) return;
      
      isLoading = true;
      statusMessage = "Generating room...";
      
      try {
         console.log("🤖 Generating a room layout...");
         
         // First clear existing objects
         clearDemoObjects();
         
         const room = await askAIRoom("Create an interesting room with various objects centered at origin");
         console.log("✅ Room layout received:", room);
         
         statusMessage = `Room with ${room.objects.length} objects created!`;
         
         // Render the room
         renderRoom(room);
         
         console.log("✅ Room rendered at origin with", room.objects.length, "objects!");
      } catch (error) {
         console.error("❌ Error generating room:", error);
         statusMessage = "Error: " + error.message;
      } finally {
         isLoading = false;
      }
   };
   
   // Animated versions for demo purposes
   const generateAnimatedObject = async () => {
      if (isLoading) return;
      isLoading = true;
      statusMessage = "Generating animated object...";
      
      try {
         clearDemoObjects();
         const objectProps = await askAIObject("Create a colorful floating object");
         statusMessage = "Animated object created!";
         
         // Render with animation
         renderObject(objectProps, { animate: true });
         
         console.log("✅ Animated object rendered!");
      } catch (error) {
         console.error("❌ Error:", error);
         statusMessage = "Error: " + error.message;
      } finally {
         isLoading = false;
      }
   };
   
   // Create an object from direct askAIObject response
   const createObjectFromResponse = async (prompt) => {
      try {
         clearDemoObjects();
         console.log("🤖 Getting object properties for:", prompt);
         
         // Extract object type from prompt if available
         const promptLower = prompt.toLowerCase();
         let explicitType = null;
         
         // Try to detect common shape types in the prompt
         const shapeTypes = ['cube', 'sphere', 'cylinder', 'cone', 'donut', 'tubeX', 'tubeY', 'tubeZ'];
         for (const type of shapeTypes) {
            if (promptLower.includes(type.toLowerCase())) {
               explicitType = type;
               break;
            }
         }
         
         // Create a more explicit prompt that includes type information
         let enhancedPrompt = prompt;
         if (explicitType) {
            enhancedPrompt = `Create a ${explicitType} with these properties: ${prompt}`;
            console.log(`Detected object type: ${explicitType}`);
         }
         
         // Get object properties from AI
         const objectProps = await askAIObject(enhancedPrompt);
         
         // Ensure type is set from prompt if available
         if (explicitType && (!objectProps.type || objectProps.type === 'sphere')) {
            console.log(`Setting explicit type from prompt: ${explicitType}`);
            objectProps.type = explicitType;
         }
         
         // Render the object
         renderObject(objectProps);
         
         return objectProps; // Still return the properties for inspection
      } catch (error) {
         console.error("❌ Error:", error);
         return null;
      }
   };
   
   // Create a room from direct askAIRoom response
   const createRoomFromResponse = async (prompt) => {
      try {
         clearDemoObjects();
         console.log("🤖 Getting room layout for:", prompt);
         
         const roomData = await askAIRoom(prompt);
         renderRoom(roomData);
         
         return roomData; // Still return the data for inspection
      } catch (error) {
         console.error("❌ Error:", error);
         return null;
      }
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
            // Button 1: Generate Object
            if (y >= 0.4 && y <= 0.55) {
               generateObject();
            }
            // Button 2: Generate Room
            else if (y >= 0.6 && y <= 0.75) {
               generateRoom();
            }
         }
      }
   };
   
   // Make these functions available in the global scope for console use
   if (typeof window !== 'undefined') {
      // Original demo functions
      window.generateObjectDemo = generateObject;
      window.generateRoomDemo = generateRoom;
      window.generateAnimatedObjectDemo = generateAnimatedObject;
      
      // Helper functions for rendering
      window.renderObject = renderObject;
      window.renderRoom = renderRoom;
      window.clearObjects = clearDemoObjects;
      
      // Wrapper functions that both get AI response AND render it
      window.createObject = createObjectFromResponse;
      window.createRoom = createRoomFromResponse;
   }
   
   console.log("🤖 Welcome to the AI WebXR Demo!");
   console.log("=================================");
   console.log("RENDER OBJECTS IN SCENE:");
   console.log("1. generateObjectDemo() - Create a basic object");
   console.log("2. generateRoomDemo() - Create a room layout");
   console.log("3. generateAnimatedObjectDemo() - Create an animated object");
   console.log("");
   console.log("CREATE AND RENDER IN ONE STEP:");
   console.log("* createObject(\"red cube\") - Get object properties AND render it");
   console.log("* createRoom(\"space station\") - Get room layout AND render it");
   console.log("");
   console.log("CORE AI QUERY FUNCTIONS:");
   console.log("* askAI(\"What is WebXR?\") - Get text response from AI");
   console.log("* askAIJson(\"Generate colors\") - Get JSON response from AI");
   console.log("* askAIObject(\"floating sphere\") - Get object properties (data only)");
   console.log("* askAIRoom(\"forest scene\") - Get room layout (data only)");
   console.log("");
   console.log("RENDERING HELPERS:");
   console.log("* renderObject(data) - Render object from properties");
   console.log("* renderRoom(data) - Render room from layout");
   console.log("* clearObjects() - Clear all objects from scene");
   
   // Position the menu for the user
   model.move(0, 1.5, -0.7).scale(0.5).animate(() => {
      panel.identity().scale(1, 0.7, 0.1);
      updateCanvas();
      
      // Add a gentle hover animation to the panel
      panel.move(0, 0.03 * Math.sin(model.time * 0.5), 0);
   });
} 