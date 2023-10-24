const fns = [
  {
    "name": "GetFileTree",
    "description": "Get the file tree of the dev environment",
    "parameters": {
      "type": "object",
      "properties": {
        "dirPath": {
          "type": "string",
          "description": "The path of the sub directory to get the file tree of. If not provided, the file tree of the root directory will be returned."
        }
      },
      "required": []
    }
  },
  {
    "name": "GetFileByPath",
    "description": "Get a file by its path, returns entire file as string.",
    "parameters": {
      "type": "object",
      "properties": {
        "filePath": {
          "type": "string",
          "description": "The path of the file to fetch"
        }
      },
      "required": ["filePath"]
    }
  },
  {
    "name": "GetTerminalText",
    "description": "Get last 100 lines of stdout, stderr text from the terminal.",
    "parameters": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "WriteOnTerminal",
    "description": "Write a command on the terminal",
    "parameters": {
      "type": "object",
      "properties": {
        "input": {
          "type": "string",
          "description": "The input to write on the terminal. The text will be written as is, so make sure to add newlines ie. \"\\n\" if you want to execute the command."
        },
        "summary": {
          "type": "string",
          "description": "The summary of what you are trying to achieve with these commands or input. This will be sent to your team manager to provide context."
        }
      },
      "required": ["command", "summary"]
    }
  },
  {
    "name": "OpenURLInBrowserAndAskQuestion",
    "description": "Open a URL in a new tab in browser and ask a question from the page. Returns the answer to the question if found.",
    "parameters": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "The URL to open in the browser"
        },
        "question": {
          "type": "string",
          "description": "The question or intent to ask from the page"
        }
      },
      "required": ["url", "question"]
    }
  },
  {
    "name": "SearchOnInternet",
    "description": "Search the internet with a search query",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "The query to search on the internet"
        }
      },
      "required": ["query"]
    }
  },
  {
    "name": "WriteToFile",
    "description": "Write to a file or create it if it doesn't exist",
    "parameters": {
      "type": "object",
      "properties": {
        "filePath": {
          "type": "string",
          "description": "The path of the file to write to or create."
        },
        "content": {
          "type": "string",
          "description": "The string to write to the file. Do note that this will overwrite entire file. So provide entire file content here."
        },
        "summary": {
          "type": "string",
          "description": "The summary of what you are trying to achieve with this write. This will be sent to your team manager to provide context."
        }
      },
      "required": ["filePath", "content", "summary"]
    }
  },
  {
    "name": "DeleteFile",
    "description": "Delete a file. This will not delete directories. Use WriteOnTerminal function to delete directories from terminal.",
    "parameters": {
      "type": "object",
      "properties": {
        "filePath": {
          "type": "string",
          "description": "The path of the file to delete"
        },
        "summary": {
          "type": "string",
          "description": "The summary of what you are trying to achieve with this delete. This will be sent to your team manager to provide context."
        }
      },
      "required": ["filePath"]
    }
  },
  {
    "name": "RenameFile",
    "description": "Rename a file",
    "parameters": {
      "type": "object",
      "properties": {
        "oldPath": {
          "type": "string",
          "description": "The current path of the file to be renamed"
        },
        "newPath": {
          "type": "string",
          "description": "The new path for the file"
        }
      },
      "required": ["oldPath", "newPath"]
    }
  }
]

export default fns;