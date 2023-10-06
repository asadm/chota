import { runDevTask } from "./dev/index.mjs";
import { runPMTask } from "./pm/index.mjs";
import { DevEnvironment } from "./environment.mjs";
import path from "path";

// const localEnv = new DevEnvironment(path.join(process.cwd(), 'sample'));

// await localEnv.OpenURLInBrowserAndAskQuestion({url: "https://nextjs.org/docs/pages/building-your-application/routing/custom-error", question: "How do I reuse the built-in error page?"})

// localEnv.destroy();

const taskList = await runPMTask(`
Task:
Add an API endpoint to login to this project. Use firebase login and store user to firebase cloudstore database.
`);

for (const task of taskList) {
    await runDevTask(task);
}