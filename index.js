import 'dotenv/config'
import OpenAI from "openai";
import fn from "./fns.mjs";
import {DevEnvironment} from "./environment.mjs";
import path from "path";
import fs from "fs";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


const sampleEnv = new DevEnvironment(path.join(process.cwd(), 'sample'));
// Step 1: send the conversation and available functions to GPT
const messages = [
    {"role": "system", "content": `You are a software developer. You are hired to do some contract work.
    As user gives you your task, you can ask questions to clarify the task. Once clarified, you can start working on the task.
    You have access to the file system, Chrome browser, the internet, and the terminal. Your goal is to complete the task by making a plan and following it. If you are unfamiliar with the task, you can always search the internet for help using the search function.
    If the question is unrelated to the task but a tech question, you can search the internet. The user is not expecting you to know everything technical.

    When accessing a path in the file tree, make sure it exists. To see all files in the project, use GetFileTree() function.

    Instead of finishing the conversation, perform the solution you have in mind using the functions available to you.

    Also note to talk minimum. The user is not expecting you to talk a lot. Don't echo back obvious facts like file data or useless facts.

    User can only help with providing clarifications for task. User cannot help with technical questions. You can search the internet for help with technical questions.
    `},
    {"role": "user", "content": "Find the port used by this project and change it to 5000."},
];
const functions = fn;
const MODEL = "gpt-4-0613" //"gpt-3.5-turbo";
// const MODEL = "gpt-3.5-turbo";
async function runConversation() {
    const lastResponse = messages[messages.length - 1];
    if (lastResponse && lastResponse.function_call) {
        const functionName = lastResponse.function_call.name;
        const functionToCall = sampleEnv[functionName].bind(sampleEnv);
        let functionResponse;
        if (!functionToCall) {
            throw new Error(`Function ${functionName} not found`);
        }
        const functionArgs = JSON.parse(lastResponse.function_call.arguments);
        try{
            functionResponse = await functionToCall(
                functionArgs
            );
        }
        catch(e){
            functionResponse = {error: e.message}
        }

        console.log("fn:", functionName, "args:", functionArgs, "response:", functionResponse, "\n")

        // Step 4: send the info on the function call and function response to GPT
        
        messages.push({
            "role": "function",
            "name": functionName,
            "content": JSON.stringify(functionResponse),
        });  // extend conversation with function response
        const secondResponse = await openai.chat.completions.create({
            model: MODEL,
            messages: messages,
            functions: functions,
            function_call: "auto",  // auto is default, but we'll be explicit
        });  // get a new response from GPT where it can see the function response
        messages.push(secondResponse.choices[0].message);  // extend conversation with assistant's reply
        console.log(JSON.stringify(secondResponse), "\n");
        // return secondResponse;
        return secondResponse.choices[0]?.finish_reason;
    }
    else{
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: messages,
            functions: functions,
            function_call: "auto",  // auto is default, but we'll be explicit
        });

        const responseMessage = response.choices[0].message;
        messages.push(responseMessage);
        console.log(JSON.stringify(response), "\n");
        return response.choices[0]?.finish_reason;
    }
    
}

while(true){
    const finish_reason = await runConversation();
    if(finish_reason === "stop"){
        break;
    }
}

fs.writeFileSync(path.join(process.cwd(), 'log.json'), JSON.stringify(messages, null, 2));

