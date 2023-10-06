import envFns from "../common/envFunctions.mjs";

const fns = [
  {
    "name": "AskQuestion",
    "description": "Ask a clarifying question from the client about the task",
    "parameters": {
      "type": "object",
      "properties": {
        "question": {
          "type": "string",
          "description": "The question to ask"
        }
      },
      "required": ["question"]
    }
  },
  {
    "name": "RunTask",
    "description": "Send the task list to the developers to complete",
    "parameters": {
      "type": "object",
      "properties": {
        "tasks": {
          "type": "array",
          "items": {
            "type": "string",
            "description": "A task to be completed by the developer. Be as specific as possible. Developers do not know the details of the overall project."
          },
          "minItems": 1,
          "description": "A list of sequenced tasks to be completed by the developers. Do note that these are completed in sequence, so the order matters.",
        }
        // "tasks": {
        //   "type": "array",
        //   "items": {
        //     "type": "object",
        //     "properties": {
        //       "id": {
        //         "type": "string",
        //         "description": "A unique identifier for the task."
        //       },
        //       "title": {
        //         "type": "string",
        //         "description": "A brief title or name of the task."
        //       },
        //       "description": {
        //         "type": "string",
        //         "description": "A detailed description of the task to be performed."
        //       },
        //       "priority": {
        //         "type": "string",
        //         "enum": ["low", "medium", "high"],
        //         "description": "Priority level of the task."
        //       }
        //     },
        //     "required": ["id", "title", "description"],
        //     "additionalProperties": false
        //   },
        //   "minItems": 1,
        //   "description": "A list of tasks to be completed by the developer."
        // }
      },
      "required": ["tasks"]
    }
  }
].concat(envFns.filter(fn => fn.name === "GetFileTree" || fn.name === "GetFileByPath"));

console.log(fns.map(fn => fn.name));

export default fns;