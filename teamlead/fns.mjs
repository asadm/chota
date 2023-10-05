const fns = [
  {
    "name": "SubmitReview",
    "description": "Submit a review for the proposed change.",
    "parameters": {
      "type": "object",
      "properties": {
        "approved": {
          "type": "boolean",
          "description": "Is the change approved?"
        },
        "reason": {
          "type": "string",
          "description": "The reason for your decision"
        }
      },
      "required": ['approved', 'reason']
    }
  },
]

export default fns;