import { runDevTask } from "./dev/index.mjs";
import { runPMTask } from "./pm/index.mjs";

const taskList = await runPMTask("Add an API endpoint to login to this project. Use firebase login and store user to firebase cloudstore database.");

for (const task of taskList) {
    await runDevTask(task);
}