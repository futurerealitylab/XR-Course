// check demoAIQuery.js and demoAIQueryConsole.js for examples

let globalAIQueryInstance = null;

/**
 * Global function to send an AI query
 * @param {string} prompt - The text prompt to send to the AI
 * @param {Object} options - Additional options for the query
 * @returns {Promise<string>} - Promise that resolves with the AI's response
 */
export function askAI(prompt, options = {}) {
    if (!globalAIQueryInstance) {
        globalAIQueryInstance = new AIQuery();
        console.log("Global AI query instance created. You can use askAI() from anywhere.");
    }
    
    console.log(`AI Query: "${prompt}"`);
    return globalAIQueryInstance.askAI(prompt, options)
        .then(response => {
            console.log(`AI Response: "${response}"`);
            return response;
        })
        .catch(error => {
            console.error(`AI Query Error: ${error.message}`);
            throw error;
        });
}

/**
 * Global function to send an AI query and receive JSON response
 * @param {string} prompt - The text prompt to send to the AI
 * @param {Object} options - Additional options for the query
 * @returns {Promise<Object>} - Promise that resolves with the AI's response as a parsed JSON object
 */
export function askAIJson(prompt, options = {}) {
    if (!globalAIQueryInstance) {
        globalAIQueryInstance = new AIQuery();
        console.log("Global AI query instance created. You can use askAIJson() from anywhere.");
    }
    
    console.log(`AI JSON Query: "${prompt}"`);
    return globalAIQueryInstance.askAIJson(prompt, options)
        .then(response => {
            console.log(`AI JSON Response:`, response);
            return response;
        })
        .catch(error => {
            console.error(`AI JSON Query Error: ${error.message}`);
            throw error;
        });
}

/**
 * Global function to generate WebXR object properties
 * @param {string} prompt - Description of the object to generate
 * @param {Object} options - Additional options for the query
 * @returns {Promise<Object>} - Promise that resolves with object properties
 */
export function askAIObject(prompt, options = {}) {
    const objectPrompt = `Generate WebXR object properties as JSON. Include position, rotation, scale, color, and type.
    Pay special attention to the "type" property, which should match what's in the query.
    
    Example format:
    {
        "type": "cube", // Valid types: cube, sphere, cylinder, cone, donut, tubeX, tubeY, tubeZ
        "position": [0, 0, 0],
        "rotation": [0, 0, 0],
        "scale": [0.3, 0.3, 0.3],
        "color": [1, 0, 0]
    }
    
    Query: ${prompt}`;
    
    return askAIJson(objectPrompt, options);
}

/**
 * Global function to generate WebXR room layouts
 * @param {string} prompt - Description of the room layout to generate
 * @param {Object} options - Additional options for the query
 * @returns {Promise<Object>} - Promise that resolves with room layout
 */
export function askAIRoom(prompt, options = {}) {
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

if (typeof window !== 'undefined') {
    window.askAI = askAI;
    window.askAIJson = askAIJson;
    window.askAIObject = askAIObject;
    window.askAIRoom = askAIRoom;
}

export class AIQuery {
    /**
     * Constructor for the AIQuery class
     * @param {Object} options - Configuration options
     * @param {string} options.apiEndpoint - The API endpoint to send queries to (default: '/api/aiquery')
     * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
     */
    constructor(options = {}) {
        this.apiEndpoint = options.apiEndpoint || '/api/aiquery';
        this.timeout = options.timeout || 30000;
        this.pendingQueries = new Map();
        this.queryCounter = 0;
        
        if (!globalAIQueryInstance) {
            globalAIQueryInstance = this;
            
            if (typeof window !== 'undefined') {
                window.askAI = askAI;
                window.askAIJson = askAIJson;
            }
        }
    }

    /**
     * Send a query to the AI model and return a Promise that resolves with the response
     * @param {string} prompt - The text prompt to send to the AI
     * @param {Object} options - Additional options for this specific query
     * @returns {Promise<string>} - Promise that resolves with the AI's response
     */
    askAI(prompt, options = {}) {
        return new Promise((resolve, reject) => {
            this.query(prompt, response => {
                if (response.startsWith("Error:")) {
                    reject(new Error(response.substring(7)));
                } else {
                    resolve(response);
                }
            }, options);
        });
    }

    /**
     * Send a query to the AI model and return a Promise that resolves with a JSON object
     * @param {string} prompt - The text prompt to send to the AI
     * @param {Object} options - Additional options for this specific query
     * @returns {Promise<Object>} - Promise that resolves with the AI's response as a parsed JSON object
     */
    askAIJson(prompt, options = {}) {
        const jsonOptions = { ...options, responseFormat: 'json' };
        
        // Create a more explicit prompt that instructs the AI to return valid JSON
        const jsonPrompt = `You must respond with valid JSON only. No explanations, no preamble, just valid parseable JSON.
        
Format your response as a JSON object that a JSON.parse() function can parse.

Here is the query: ${prompt}`;
        
        return new Promise((resolve, reject) => {
            this.query(jsonPrompt, response => {
                if (response.startsWith("Error:")) {
                    reject(new Error(response.substring(7)));
                } else {
                    try {
                        // Try to extract JSON if the response contains non-JSON text
                        let jsonText = response.trim();
                        
                        // If response has markdown code blocks, extract JSON from there
                        if (jsonText.includes("```json")) {
                            const startIndex = jsonText.indexOf("```json") + 7;
                            const endIndex = jsonText.indexOf("```", startIndex);
                            if (endIndex > startIndex) {
                                jsonText = jsonText.substring(startIndex, endIndex).trim();
                            }
                        } else if (jsonText.includes("```")) {
                            const startIndex = jsonText.indexOf("```") + 3;
                            const endIndex = jsonText.indexOf("```", startIndex);
                            if (endIndex > startIndex) {
                                jsonText = jsonText.substring(startIndex, endIndex).trim();
                            }
                        }
                        
                        // If still not valid JSON, try to extract just the JSON part
                        try {
                            JSON.parse(jsonText);
                        } catch (e) {
                            const jsonStartIndex = jsonText.indexOf('{');
                            const jsonEndIndex = jsonText.lastIndexOf('}');
                            
                            if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
                                jsonText = jsonText.substring(jsonStartIndex, jsonEndIndex + 1);
                            }
                        }
                        
                        // Try to parse as JSON
                        const jsonResponse = JSON.parse(jsonText);
                        resolve(jsonResponse);
                    } catch (error) {
                        console.error("Failed to parse JSON response:", response);
                        reject(new Error(`Failed to parse response as JSON: ${error.message}`));
                    }
                }
            }, jsonOptions);
        });
    }

    /**
     * Send a query to the AI model
     * @param {string} queryText - The text of the query
     * @param {Function} callback - Function to call when response is received
     * @param {Object} options - Additional options for this specific query
     * @returns {number} - Query ID that can be used to cancel the query
     */
    query(queryText, callback, options = {}) {
        const queryId = this.queryCounter++;
        
        const queryPromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Query timed out'));
                this.pendingQueries.delete(queryId);
            }, options.timeout || this.timeout);
            
            this.pendingQueries.set(queryId, {
                resolve,
                reject,
                timeoutId,
                callback
            });
            
            fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: queryText,
                    queryId: queryId,
                    ...options
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                resolve(data.response);
            })
            .catch(error => {
                reject(error);
            });
        });
        
        queryPromise
            .then(response => {
                const queryInfo = this.pendingQueries.get(queryId);
                if (queryInfo) {
                    clearTimeout(queryInfo.timeoutId);
                    queryInfo.callback(response);
                    this.pendingQueries.delete(queryId);
                }
            })
            .catch(error => {
                const queryInfo = this.pendingQueries.get(queryId);
                if (queryInfo) {
                    clearTimeout(queryInfo.timeoutId);
                    queryInfo.callback(`Error: ${error.message}`);
                    this.pendingQueries.delete(queryId);
                }
            });
        
        return queryId;
    }
    
    /**
     * Cancel a pending query
     * @param {number} queryId - The ID of the query to cancel
     * @returns {boolean} - True if the query was cancelled, false if it wasn't found
     */
    cancelQuery(queryId) {
        const queryInfo = this.pendingQueries.get(queryId);
        if (queryInfo) {
            clearTimeout(queryInfo.timeoutId);
            queryInfo.reject(new Error('Query cancelled'));
            this.pendingQueries.delete(queryId);
            return true;
        }
        return false;
    }
    
    cancelAllQueries() {
        for (const [queryId, queryInfo] of this.pendingQueries.entries()) {
            clearTimeout(queryInfo.timeoutId);
            queryInfo.reject(new Error('Query cancelled'));
            this.pendingQueries.delete(queryId);
        }
    }
} 