import { runDevTask } from "../agents/dev/index.mjs";
import { runQATask } from "../agents/qa/index.mjs";
import { DevEnvironment } from "../common/environment.mjs";
import path from "path";
import { getContextFromIssue } from "../common/githubHelpers.mjs";


const overallTaskContext = await getContextFromIssue();
const envPath = path.join(process.cwd(), process.argv[2] || 'sample');
const localEnv = new DevEnvironment(envPath, overallTaskContext);
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