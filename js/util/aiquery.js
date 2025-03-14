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
            console.log(`AI Response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
            return response;
        })
        .catch(error => {
            console.error(`AI Query Error: ${error.message}`);
            throw error;
        });
}

if (typeof window !== 'undefined') {
    window.askAI = askAI;
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