import 'dotenv/config'
import OpenAI from "openai";
import fn from "./fns.mjs";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const functions = fn;
const MODEL = "gpt-4-0613" //"gpt-3.5-turbo";
// const MODEL = "gpt-3.5-turbo";
export async function reviewChange(change) {
    console.log("REVIEWING CHANGE", change)
    const messages = [
        {
            "role": "system", "content": `You are a team lead of a programming team responsible for reviewing changes by your team to your project. Does the following change make sense, given the Reason at bottom?

        Make sure the change does only what's written as reason. If you think the change breaks something, reject the change with reason.
        
        Call the SubmitReview function with your decision and reason.

        The reason should propose the solution if you are rejecting the change. If you are approving the change, the reason can be short.
        `},
        { "role": "user", "content": `ChangeType:\n${change.changeType}\nReason:\n${change.reason} \n Old State:\n${change.old}\nNew State:\n${change.new}` },
    ];
    
    return askReviewer(messages);
}

export async function reviewSummary(originalTask, summary) {
    console.log("REVIEWING Summary", summary)
    const messages = [
        {
            "role": "system", "content": `You are a team lead of a programming team responsible for reviewing job completion by your team to your project. After the job is done, the following is the final summary message by the developer. Does the following message make sense, given the Reason at bottom?
        
        Call the SubmitReview function with your decision and reason.

        The reason should propose the solution if you are rejecting the summary of job. If you are approving, the reason can be short.
        `},
        { "role": "user", "content": `Original Task:\n${originalTask}\nTask Done Summary:\n${summary}` },
    ];
    
    return askReviewer(messages);
}

function askReviewer(messages){
    return new Promise(async (resolve, reject) => {

        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: messages,
            functions: functions,
            function_call: { "name": "SubmitReview" },
        });
        const responseMessage = response.choices[0].message;
        // Step 2: check if GPT wanted to call a function

        console.log("LEAD: ", JSON.stringify(response), "\n");

        if (responseMessage.function_call) {
            // Step 3: call the function
            // Note: the JSON response may not always be valid; be sure to handle errors
            const availableFunctions = {
                SubmitReview: ({approved, reason}) => {
                    if (approved) {
                        resolve(reason);
                    }
                    else {
                        reject(new Error(reason));
                    }
                },

            };  // only one function in this example, but you can have multiple
            const functionName = responseMessage.function_call.name;
            const functionToCall = availableFunctions[functionName];
            if (!functionToCall) {
                throw new Error(`Function ${functionName} not found`);
            }
            const functionArgs = JSON.parse(responseMessage.function_call.arguments);
            try {
                functionToCall(
                    functionArgs
                );
            }
            catch (e) {
                reject(e.message)
            }
        }
    });
}