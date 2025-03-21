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