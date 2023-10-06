const fns = [
  {
    "name": "Answer",
    "description": "Answer to the question asked by the user.",
    "parameters": {
      "type": "object",
      "properties": {
        "answer": {
          "type": "string",
          "description": "The answer itself as string"
        }
      },
      "required": ["answer"]
    }
  },
]

export default fns;