import 'dotenv/config'
import fn from "./fns.mjs";
import { DevEnvironment } from "../environment.mjs";
import { logGray } from '../common/log.mjs';
import path from "path";
import fs from "fs";
// import { reviewSummary } from '../teamlead/index.mjs';
import { openai } from '../common/openai.mjs';
import prompt from 'prompt-sync';

const functions = fn;
const MODEL = "gpt-4-0613" //"gpt-3.5-turbo";
// const MODEL = "gpt-3.5-turbo";

async function runConversation(messages, localEnv, localFunctions) {
    const lastResponse = messages[messages.length - 1];
    if (lastResponse){
        logGray(lastResponse);
    }
    if (lastResponse && lastResponse.function_call) {
        const functionName = lastResponse.function_call.name;
        const functionToCall = localEnv[functionName]?.bind(localEnv) || localFunctions[functionName];
        let functionResponse;
        if (!functionToCall) {
            throw new Error(`Function ${functionName} not found`);
        }
        const functionArgs = JSON.parse(lastResponse.function_call.arguments);
        try {
            functionResponse = await functionToCall(
                functionArgs
            );
        }
        catch (e) {
            functionResponse = { error: e.message }
        }

        console.log("🔷", functionName, "(", functionArgs, ")\n")

        if (functionName === "RunTask"){
            return "stop";
        }

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
        let resp = secondResponse.choices[0].message;
        if (!resp.content) resp.content = "";
        messages.push(resp);  // extend conversation with assistant's reply
        logGray(secondResponse.choices[0].message);
        // console.log(JSON.stringify(secondResponse), "\n");
        // return secondResponse;
        return secondResponse.choices[0]?.finish_reason;
    }
    else {
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: messages,
            functions: functions,
            function_call: "auto",  // auto is default, but we'll be explicit
        });

        const responseMessage = response.choices[0].message;
        if (!responseMessage.content) responseMessage.content = "";
        messages.push(responseMessage);
        logGray(responseMessage);
        // console.log(JSON.stringify(response), "\n");
        return response.choices[0]?.finish_reason;
    }

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runQATask(context, envPath = path.join(process.cwd(), 'sample')) {
    let bugList = [];
    let endQACalled = false;
    let endQASummary = "";
    let runnableDesciption = "";
    const localFunctions = {
        "FileBug": async function (args) {
            console.log("🐛", args);
            bugList.push(args.description);
            return "Bug filed.";
        },
        "EndQA": async function (args) {
            console.log("🐛🏁", args);
            endQACalled = true;
            endQASummary = args.summary;
            runnableDesciption = args.runnable;
            return "QA ended.";
        }
    };
    console.log("🔍", "runQATask(", context, ")");
    // const task = "Find the port used by this project and change it to 5000.";
    // const task = "Find and move the port constant to index itself, cleanup unused file.";
    const localEnv = new DevEnvironment(envPath);

    const messages = [
        {
            "role": "system", "content": `You are a senior QA engineer of your team. Your team has sent you the task they claim to have finished for the user.
        Look at the original context and requirement of user. Then review the task and decide if it is complete.
        1. Check the existing codebase by using the GetFileTree function and GetFileByPath function.
        2. Use SearchOnInternet function to verify information about the problem. Your knowledge of the problem is stale, so you need to search.
        3. From search results, open and research a page in new browser tab by using OpenURLInBrowserAndAskQuestion function. Do this as many times as you need to understand the task and solution.
        4. Now look at the code base again and verify that the task is complete.
        5. If you find an issue or a potential bug, call the FileBug function with a detailed bug description and include any relevant code snippets and file paths in the bug description.
        6. Now try to figure out how to run this project. If you find out how to run it, run it from terminal using WriteOnTerminal, GetTerminalText and verify that the task is complete using GetTerminalText and if it's a web project, using OpenURLInBrowserAndAskQuestion if possible.
        7. If you run the project and find an issue or a potential bug, call the FileBug function with a detailed bug description and include any relevant repro steps and URLs in the bug description.
        8. Once you are done reviewing the task, call EndQA function with summary of your findings and also if project was runnable or not and why.
    `},
        { "role": "user", "content": context },
    ];


    while (true) {
        let finish_reason;
        try {
            finish_reason = await runConversation(messages, localEnv, localFunctions);
        }
        catch (e) {
            if (e.message.indexOf("Rate limit reached") !== -1) {
                console.log("RATE LIMIT REACHED", e.message);
                await sleep(5000);
                continue;
            }
            else{
                console.log("ERROR", e);
            }
        }
        if (finish_reason === "stop" || endQACalled) {
            // Summary is reviewed by team lead
            if (!endQACalled){
                console.log("🔴 REJECTED!", "EndQA was not called.");
                messages.push({ role: "system", content: `Answer Rejected: EndQA function was not called.` });
            }
            else{
                break;
            }
        }
        await sleep(5000);
    }

    localEnv.destroy();
    fs.writeFileSync(path.join(process.cwd(), 'log.qa.json'), JSON.stringify(messages, null, 2));
    return {bugs: bugList, summary: endQASummary};
}

