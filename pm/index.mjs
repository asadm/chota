import 'dotenv/config'
import fn from "./fns.mjs";
import { DevEnvironment } from "../environment.mjs";
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
        messages.push(responseMessage);
        // console.log(JSON.stringify(response), "\n");
        return response.choices[0]?.finish_reason;
    }

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runPMTask(taskDescription, envPath = path.join(process.cwd(), 'sample')) {
    let runTaskCalled = false;
    let taskListFromPM = [];
    const localFunctions = {
        //TODO: add layer of AI here
        "AskQuestion": async function (args) {
            console.log("🤔", args);
            const Answer = prompt({sigint: true})('Answer:');
            return Answer;
            // return "The answer is 42.";
        },
        "RunTask": async function (args) {
            if (!args || args.tasks.length === 0){
                return "Task list is empty.";
            }
            runTaskCalled = true;
            console.log("🏃‍♀️", args);
            taskListFromPM = args.tasks;
            // return "Task completed.";
        }
    };
    console.log("🐣", "TaskStart(", taskDescription, ")");
    // const task = "Find the port used by this project and change it to 5000.";
    // const task = "Find and move the port constant to index itself, cleanup unused file.";
    const localEnv = new DevEnvironment(envPath);

    const messages = [
        {
            "role": "system", "content": `You are a customer facing software project manager. Your team is hired to do some contract work.
        As user gives you your task, and do the following process:
        1. Check the existing codebase by using the GetFileTree function and GetFileByPath function.
        2. Write a detailed list of tasks to complete the job. The developers do not know the details of the overall project, so you need to be very specific in your individual tasks.
        3. If you need to clarify the task, use the AskQuestion function.
        4. Once you are satisfied with your task list, call the RunTask function with the task list.

        Do note that each task should only be under 50 lines of code change. If you need to change more than 50 lines of code, you need to break it down into multiple tasks.
    `},
        { "role": "user", "content": taskDescription },
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
                console.log("ERROR", e.message);
            }
        }
        if (finish_reason === "stop") {
            // Summary is reviewed by team lead
            if (!runTaskCalled){
                console.log("🔴 REJECTED!", "RunTask was not called.");
                messages.push({ role: "system", content: `Answer Rejected: RunTask function was not called.` });
            }
            else{
                break;
            }
            // try {
            //     // TODO: remove this and make them submit tasklist and verify that instead
            //     await reviewSummary(messages[1].content, messages[messages.length - 1].content);
            //     console.log("🟢 APPROVED!");
            //     break;
            // }
            // catch (e) {
            //     console.log("🔴 REJECTED!", e.message);
            //     messages.push({ role: "system", content: `User Rejected: ${e.message}` });
            //     continue;
            // }
        }
        await sleep(5000);
    }

    localEnv.destroy();
    fs.writeFileSync(path.join(process.cwd(), 'log.pm.json'), JSON.stringify(messages, null, 2));
    return taskListFromPM;
}

