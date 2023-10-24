import { logGray } from '../../common/log.mjs';
import path from "path";
import fs from "fs";
import { openai } from '../../common/openai.mjs';

const MODEL = "gpt-3.5-turbo-16k";

async function runConversation(messages) {
  const lastResponse = messages[messages.length - 1];
  if (lastResponse) {
    logGray(lastResponse.role, lastResponse.content ? lastResponse.content.slice(0, 100) : lastResponse);
  }

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: messages,
  });

  const responseMessage = response.choices[0].message;
  messages.push(responseMessage);
  return response.choices[0]?.finish_reason;
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
  console.log("📄", "runPageQuestioner(", url, ", content[", content.split(" ").length, " words] )");

  const messages = [
    {
      "role": "system", "content": `You are a page reader helping people who cannot read. You will answer question directly from the page content provided. Do not use any other sources. You can use the following page content to answer the question.

            Make sure you quote the entire section relevant. Do not summarize or paraphrase. Answer the question completely and in great detail.

            If the page does not have the answer, you can say "The page does not have the answer".

            If there are hints on the page, you can provide the hints.
            "
    `},
    { "role": "user", "content": `Page Content of ${url}:\n${trimStringToMaxWords(content, 6000)}\n\n\nQuestion:\n${question}` },
  ];


  while (true) {
    let finish_reason;
    try {
      finish_reason = await runConversation(messages);
    }
    catch (e) {
      if (e.message.indexOf("Rate limit reached") !== -1) {
        console.log("RATE LIMIT REACHED", e.message);
        await sleep(5000);
        continue;
      }
      else {
        console.log("ERROR", e);
        fs.writeFileSync(path.join(process.cwd(), 'log.pagequestioner.json'), JSON.stringify(messages, null, 2));
      }
    }
    if (finish_reason === "stop") {
      const lastmsg = messages[messages.length - 1];
      if (lastmsg.role === "assistant" && lastmsg.content) {
        answerGiven = lastmsg.content;
        break;
      }
      else {
        messages.push({ role: "system", content: `Answer Rejected: Answer was not provided.` });
      }
    }
    await sleep(5000);
  }
  console.log("🟢 APPROVED!");
  fs.writeFileSync(path.join(process.cwd(), 'log.pagequestioner.json'), JSON.stringify(messages, null, 2));
  return answerGiven;
}
