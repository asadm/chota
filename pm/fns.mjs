import envFns from "../common/envFunctions.mjs";

const envFunctionsAvailableToPM = [
  "GetFileTree",
  "GetFileByPath",
  "SearchOnInternet",
  "OpenURLInBrowserAndAskQuestion",
  // "GetCurrentBrowserTabs",
  // "CloseBrowserTab",
]

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
      },
      "required": ["tasks"]
    }
  }
].concat(envFns.filter(fn => envFunctionsAvailableToPM.indexOf(fn.name) !== -1));
//envFns.filter(fn => fn.name === "GetFileTree" || fn.name === "GetFileByPath" || fn.name === "SearchOnInternet" || fn.name==="OpenURLInBrowserAndAskQuestion" || fn.name === "GetCurrentBrowserTabs" || fn.name === "CloseBrowserTab")

export default fns;