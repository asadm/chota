import { DevEnvironment } from "../common/environment.mjs";
import path from "path";
import { getContextFromIssue } from "../common/githubHelpers.mjs";

const envPath = path.join(process.cwd(), process.argv[2] || 'sample');
const overallTaskContext = await getContextFromIssue();
const localEnv = new DevEnvironment(envPath, `test the dev environment.`);

await localEnv.WriteOnTerminal({input: "ls -lh\n", summary: "testing if terminal works"});
let output = await localEnv.GetTerminalText();
console.log("SHELL OUTPUT:", output);

await localEnv.WriteToFile({filePath: "test.json", content: "test time:" + (new Date().toISOString()) , summary: "writing a test json file"});
await localEnv.RenameFile({oldPath:"test.json", newPath: "test2.json", summary: "renaming a test json file"});

console.log("changelist?")
const changelist = localEnv.getChangelistSummary();
console.log(changelist);
console.log("FINISHED");

// Cleanup and exit any processes that are still running
localEnv.destroy();