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