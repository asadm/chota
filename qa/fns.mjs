import envFns from "../common/envFunctions.mjs";

const envFunctionsAvailableToQA = [
  "GetFileTree",
  "GetFileByPath",
  "SearchOnInternet",
  "OpenURLInBrowserAndAskQuestion",
]

const fns = [
  {
    "name": "FileBug",
    "description": "File a bug with the developers to fix",
    "parameters": {
      "type": "object",
      "properties": {
        "description": {
          "type": "string",
          "description": "The description of the bug along with code snippets, reproduction steps, and file paths"
        }
      },
      "required": ["description"]
    }
  },
  {
    "name": "EndQA",
    "description": "End the QA session",
    "parameters": {
      "type": "object",
      "properties": {
        "summary": {
          "type": "string",
          "description": "The summary of the QA findings"
        }
      },
      "required": ["summary"]
    }
  }
].concat(envFns.filter(fn => envFunctionsAvailableToQA.indexOf(fn.name) !== -1));

export default fns;