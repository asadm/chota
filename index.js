import { runDevTask } from "./dev/lite.mjs";
import { runPMTask } from "./pm/index.mjs";
import { runQATask } from "./qa/index.mjs";
import { DevEnvironment } from "./environment.mjs";
import path from "path";
import { getContextFromIssue } from "./common/githubContext.mjs";
const localEnv = new DevEnvironment(path.join(process.cwd(), 'sample'));

const overallTaskContext = await getContextFromIssue();

// const taskList = await runPMTask(overallTaskContext, localEnv);

// console.log("TASK LIST", taskList, taskList.length);
// // process.exit(0);
// let taskListSummaries = [];
// for (const task of taskList) {
//   const resultSummary = await runDevTask(task, overallTaskContext + "\n\nWork done so far:\n" + taskListSummaries.map(s => `Dev: ${s}`).join("\n\n"), localEnv);
//   taskListSummaries.push(resultSummary);
// }

const resultSummary = await runDevTask(overallTaskContext, localEnv);

let bugs = [];
const resp = await runQATask(overallTaskContext, localEnv, true);
bugs = resp.bugs;
console.log("QA SUMMARY", bugs.length);
for (const bug of bugs) {
  const rep = `Bug Report:\n${bug} \n\n`;
  await runDevTask(overallTaskContext + "\n\n" + rep, localEnv);
}
console.log("FINISHED");

localEnv.destroy();