import { logGray } from '../common/log.mjs';
import path from "path";
import fs from "fs";
import functions from "./fns.mjs";
import { openai } from '../common/openai.mjs';

const MODEL = "gpt-3.5-turbo-16k";

async function runConversation(messages, localFunctions) {
    const lastResponse = messages[messages.length - 1];
    if (lastResponse){
        logGray(lastResponse.role, lastResponse.content?lastResponse.content.slice(0, 100):"");
    }
    if (lastResponse && lastResponse.function_call) {
        const functionName = lastResponse.function_call.name;
        const functionToCall = localFunctions[functionName];
        let functionResponse;
        if (!functionToCall) {
            throw new Error(`Function ${functionName} not found`);
        }
        let functionArgs;
        try {
            functionArgs = JSON.parse(lastResponse.function_call.arguments);
            console.log("🔷", functionName, "(", functionArgs, ")\n")
            functionResponse = await functionToCall(
                functionArgs
            );
        }
        catch (e) {
            functionResponse = { error: e.message }
        }
        return;
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

function trimStringToMaxWords(str, maxWords) {
    return str.split(" ").slice(0, maxWords).join(" ")
    // also handle new lines
    .split("\n").slice(0, maxWords).join("\n")
    ;
}

export async function runPageQuestioner(url, content, question) {
    let answerGiven = undefined;
    const localFunctions = {
        //TODO: add layer of AI here
        "Answer": async function (args) {
            console.log("🤔📄", args);
            answerGiven = args.answer;
        },
        
    };
    console.log("📄", "runPageQuestioner(", url, ", content[",content.split(" ").length, " words] )");

    const messages = [
        {
            "role": "system", "content": `You are a page reader helping people who cannot read. You will answer question directly from the page content provided. Do not use any other sources. You can use the following page content to answer the question.

            Make sure you quote the entire section relevant. Do not summarize or paraphrase. Answer the question completely and in great detail.

            If the page does not have the answer, you can say "The page does not have the answer.
            
            ALWAYS CALL THE ANSWER FUNCTION. If you do not call the answer function, your answer will be rejected.
            "
    `},
        { "role": "user", "content": `Page Content of ${url}:\n${trimStringToMaxWords(content, 6000)}\n\n\nQuestion:\n${question}` },
    ];


    while (true) {
        let finish_reason;
        try {
            finish_reason = await runConversation(messages, localFunctions);
        }
        catch (e) {
            if (e.message.indexOf("Rate limit reached") !== -1) {
                console.log("RATE LIMIT REACHED", e.message);
                await sleep(5000);
                continue;
            }
            else{
                console.log("ERROR", e);
                fs.writeFileSync(path.join(process.cwd(), 'log.pagequestioner.json'), JSON.stringify(messages, null, 2));
            }
        }
        if (finish_reason === "stop" || answerGiven) {
            // Summary is reviewed by team lead
            if (!answerGiven){
                console.log("🔴 REJECTED!", "Answer function was not called.");
                messages.push({ role: "system", content: `Answer Rejected: Answer function was not called.` });
            }
            else{
                break;
            }
        }
        await sleep(5000);
    }
    console.log("🟢 APPROVED!");
    fs.writeFileSync(path.join(process.cwd(), 'log.pagequestioner.json'), JSON.stringify(messages, null, 2));
    return answerGiven;
}

