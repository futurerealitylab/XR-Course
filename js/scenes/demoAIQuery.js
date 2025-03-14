import { AIQuery } from "../util/aiquery.js";

export const init = async model => {
   let cube = model.add('cube');
   
   let aiQuery = new AIQuery();
   
   const getAIResponse = async (prompt) => {
      try {
         console.log(`Sending query: "${prompt}"`);
         const response = await aiQuery.askAI(prompt);
         console.log(`Received response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
         return response;
      } catch (error) {
         console.error(`Error getting AI response: ${error.message}`);
         return `Error: ${error.message}`;
      }
   };
   
   const getAIResponseWithPromise = (prompt) => {
      console.log(`Sending query with Promise: "${prompt}"`);
      return aiQuery.askAI(prompt)
         .then(response => {
            console.log(`Received response with Promise: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
            return response;
         })
         .catch(error => {
            console.error(`Error getting AI response with Promise: ${error.message}`);
            return `Error: ${error.message}`;
         });
   };
   
   const runExamples = async () => {
      // Example 1: Using async/await
      const response1 = await getAIResponse("What is WebXR?");
      console.log("Example 1 complete");

      
      // Example 2: Using Promise chaining
      getAIResponseWithPromise("How can AI enhance virtual reality?")
         .then(() => console.log("Example 2 complete"));

      
      // Example 3: Running multiple queries in parallel
      const prompts = [
         "Explain the concept of spatial computing",
         "What are the benefits of VR for education?"
      ];
      const responses = await Promise.all(prompts.map(prompt => aiQuery.askAI(prompt)));
      console.log("Example 3 complete - received all parallel responses");
      
      
      // Example 4: Error handling
      try {
         const response = await aiQuery.askAI("This query will timeout", { timeout: 1 });
      } catch (error) {
         console.log("Example 4 complete - caught error:", error.message);
      }
   };
   
   runExamples();
   
   model.move(0, 1.5, 0).scale(.3).animate(() => {
      cube.identity().turnY(model.time).scale(.5);
   });
} 