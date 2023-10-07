import { runDevTask } from "./dev/index.mjs";
import { runPMTask } from "./pm/index.mjs";
import { runQATask } from "./qa/index.mjs";
import { DevEnvironment } from "./environment.mjs";
import path from "path";
import { reviewQABugReport } from "./teamlead/index.mjs";

// const localEnv = new DevEnvironment(path.join(process.cwd(), 'sample'));

// await localEnv.OpenURLInBrowserAndAskQuestion({url: "https://nextjs.org/docs/pages/building-your-application/routing/custom-error", question: "How do I reuse the built-in error page?"})

// localEnv.destroy();
const overallTaskContext = `
Context:
User: Add an API endpoint to login to this project. Use firebase login and store user to firebase cloudstore database.
PM: Credentials for firebase?
User: Use placeholders for now.

`;

// const overallTaskContext = `Create a basic http server that listens on port 3333`
const taskList = await runPMTask(overallTaskContext);

for (const task of taskList) {
    await runDevTask(task, overallTaskContext);
}


let bugList = [];
do{
  // const bugs = ["There is no code implementation found for an API endpoint for user login using Firebase Authentication."]
  // const summary = "";
  const {bugs, summary} = await runQATask(overallTaskContext);
  console.log("QA Summary", summary)
  for (const bug of bugs){
    try{
      await reviewQABugReport(bug, overallTaskContext);
      bugList.push(bug);
    }
    catch(e){
      console.log("BUG REJECTED", e);
    }
  }

  //TODO: ask dev to fix bugs here
}
while(bugList.length > 0);

// TODO: ask lead or pm feedback on qa bugs and summary and close if insignificant or assign to dev if significant
// console.log("QA RESULT", qaResult);