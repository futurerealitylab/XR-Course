# AI Query Utilities

Simple utilities for making AI queries in your WebXR environment.

## Quick Start

```javascript
// For text responses
const response = await askAI("What is WebXR?");

// For JSON responses
const data = await askAIJson("Give me the coordinates for a cube: x, y, z");
```

## Available Functions

### `askAI(prompt, options)`
Makes an AI query and returns a text response.

```javascript
const response = await askAI("How do I create a VR scene?", {
  model: "gpt-4", // Optional: specify model
  timeout: 60000  // Optional: custom timeout in ms (default: 30000)
});
```

### `askAIJson(prompt, options)`
Makes an AI query and returns a parsed JSON response.

```javascript
const data = await askAIJson("Generate 3D object properties", {
  model: "gpt-4",    // Optional: specify model
  apiEndpoint: "/custom/endpoint" // Optional: custom API endpoint
});
```

### `askAIObject(prompt, options)`
Generates WebXR object properties in JSON format.

```javascript
const objectProps = await askAIObject("Create a red sphere");
// Returns: { type: "sphere", position: [0, 0, 0], rotation: [0, 0, 0], scale: [0.3, 0.3, 0.3], color: [1, 0, 0] }
```

### `askAIRoom(prompt, options)`
Generates a complete WebXR room layout with multiple objects.

```javascript
const room = await askAIRoom("Create a simple room with a cube and sphere");
// Returns: { objects: [{ type: "cube", ... }, { type: "sphere", ... }] }
```

## Creating Custom Methods

You can create your own specialized query methods with custom system prompts:

```javascript
// Example: Create a method for generating 3D animations
function askAIAnimation(prompt, options = {}) {
    const animationPrompt = `You must respond with a valid JSON animation sequence.
    Format your response as an array of keyframes with timestamps.
    No explanations, just valid JSON.
    
    Here is the query: ${prompt}`;
    
    return askAIJson(animationPrompt, options);
}

// Example: Create a method for scene descriptions
function askAIScene(prompt, options = {}) {
    const customOptions = {
        ...options,
        systemPrompt: "You are a WebXR scene designer. Provide detailed scene layouts and object placements."
    };
    return askAI(prompt, customOptions);
}
```

## WebXR Examples

Here are some practical examples for generating WebXR objects and scenes:

### Generate Object Properties
```javascript
// Create a method for WebXR object properties
function askAIObject(prompt, options = {}) {
    const objectPrompt = `Generate WebXR object properties as JSON. Include position, rotation, scale, and color.
    Example format:
    {
        "position": [0, 1.5, 0],
        "rotation": [0, 0, 0],
        "scale": [0.3, 0.3, 0.3],
        "color": [1, 0, 0]
    }
    
    Query: ${prompt}`;
    
    return askAIJson(objectPrompt, options);
}

// Usage example:
const sphere = await askAIObject("Create a red sphere floating at eye level");
model.add('sphere')
     .move(...sphere.position)
     .scale(...sphere.scale)
     .color(...sphere.color);
```

### Generate Scene Layout
```javascript
// Create a method for room layouts
function askAIRoom(prompt, options = {}) {
    const roomPrompt = `Generate a WebXR room layout as JSON. Include an array of objects with their properties.
    Example format:
    {
        "objects": [
            {
                "type": "cube",
                "position": [0, 1, 0],
                "scale": [0.4, 0.4, 0.4],
                "texture": "brick"
            },
            {
                "type": "sphere",
                "position": [1, 1.5, 0],
                "color": [1, 1, 0]
            }
        ]
    }
    
    Query: ${prompt}`;
    
    return askAIJson(roomPrompt, options);
}

// Usage example:
const room = await askAIRoom("Create a simple room with a floating cube and sphere");
room.objects.forEach(obj => {
    const shape = model.add(obj.type);
    if (obj.position) shape.move(...obj.position);
    if (obj.scale) shape.scale(...obj.scale);
    if (obj.color) shape.color(...obj.color);
    if (obj.texture) shape.txtr(obj.texture);
});
```

## Rendering Helpers

For a better developer experience, you can create convenience functions that both generate and render WebXR objects in one step. Our demoAIQueryConsole.js provides examples of these:

```javascript
// Create and render a single object
async function createObject(prompt) {
  // Clear existing objects
  clearObjects();
  
  // Extract object type from prompt (e.g., "cube" from "red cube")
  const type = extractTypeFromPrompt(prompt);
  
  // Get properties from AI with enhanced prompt
  const objectProps = await askAIObject(prompt);
  
  // Ensure type is applied from prompt if available
  if (type) objectProps.type = type;
  
  // Render the object in the scene
  return renderObject(objectProps);
}

// Create and render a room with multiple objects
async function createRoom(prompt) {
  // Clear existing objects
  clearObjects();
  
  // Get room layout from AI
  const roomData = await askAIRoom(prompt);
  
  // Render all objects in the room
  return renderRoom(roomData);
}
```

### Global Helper Functions

In your application, you can make these functions globally available for easy console usage:

```javascript
// Make functions available in the global scope
if (typeof window !== 'undefined') {
  // Main creator functions
  window.createObject = createObjectFunction;
  window.createRoom = createRoomFunction;
  
  // Rendering utilities
  window.renderObject = renderObjectFunction;
  window.renderRoom = renderRoomFunction;
  window.clearObjects = clearObjectsFunction;
}
```

This allows developers to simply type `createObject("red cube")` in the console to immediately generate and see an object in their WebXR scene.

## Demo Scene: AI WebXR Generator

We've included a complete demo scene `demoAIQueryConsole.js` that showcases the AI query utilities in action. This scene provides a user interface and console functions to experiment with AI-generated WebXR content.

### Using the Demo Scene

1. **Launch the scene**:
   Load the scene in your WebXR environment.

2. **Interact with the UI panel**:
   - Click the "Generate Object" button to create a random object
   - Click the "Generate Room" button to create a room layout with multiple objects

3. **Use console commands**:
   Open your browser's developer console (F12 or Cmd+Option+I) and try these commands:

   ```javascript
   // Generate and render a specific object
   createObject("large blue cube");
   createObject("spinning red donut");
   createObject("tiny green cylinder");
   
   // Generate and render an entire room
   createRoom("space station with planets");
   createRoom("forest with trees and rocks");
   
   // Clear all objects from the scene
   clearObjects();
   
   // Create an animated object
   generateAnimatedObjectDemo();
   ```

4. **Get AI responses without rendering**:
   ```javascript
   // Get text responses
   askAI("What are the best practices for WebXR UI design?");
   
   // Get JSON data
   askAIJson("Generate a color palette for a space game");
   
   // Get object properties without rendering
   const cubeProps = await askAIObject("Create a golden cube");
   console.log(cubeProps);
   
   // Get room layout without rendering
   const room = await askAIRoom("Japanese garden");
   console.log(room);
   ```

5. **Render existing data**:
   ```javascript
   // First get data
   const objectData = await askAIObject("glowing orb");
   
   // Then render it
   renderObject(objectData);
   ```

### How It Works

The demo detects object types in your prompts, such as "cube" or "sphere", and ensures the AI generates the correct shape. Objects are created at the world origin (0,0,0) by default, but you can specify custom positions in your prompts.

All generated objects and their properties are logged to the console for inspection, making it easy to understand the AI's output and how it translates to WebXR objects.

## Configuration

The AI query instance is created automatically on first use. You can customize it by creating your own instance:

```javascript
const ai = new AIQuery({
  apiEndpoint: "/custom/endpoint", // Default: "/api/aiquery"
  timeout: 60000                   // Default: 30000ms
});
```

## Error Handling

```javascript
try {
  const response = await askAI("Your prompt");
} catch (error) {
  console.error("AI query failed:", error.message);
}
```

Note: Make sure you have set up your OpenAI API key in the server's `.env` file as `OPENAI_API_KEY=your_key_here` 