import { runDevTask } from "./agents/dev/index.mjs";
import { runQATask } from "./agents/qa/index.mjs";
import { DevEnvironment } from "./common/environment.mjs";
import path from "path";
import { getContextFromIssue } from "./common/githubContext.mjs";

const defaultPath = path.join(process.cwd(), 'sample');
const localEnv = new DevEnvironment(process.argv[2] || defaultPath);
const overallTaskContext = await getContextFromIssue();

// Run first dev task
const resultSummary = await runDevTask(overallTaskContext, localEnv);

// Run QA task to find bugs
const {bugs} = await runQATask(overallTaskContext, localEnv, true);
console.log("QA SUMMARY", bugs.length);

// Run dev tasks to fix bugs
for (const bug of bugs) {
  const rep = `Bug Report:\n${bug} \n\n`;
  await runDevTask(overallTaskContext + "\n\n" + rep, localEnv);
}

console.log("FINISHED");

// Cleanup and exit any processes that are still running
localEnv.destroy();