![header.png](header.png)
## Chota [cho-taa]: Small • Apprentice • Helper for trivial tasks

Chota is a developer that lives in GitHub action. You can assign it trivial coding tasks using Github Issues and it sends a PR with the solution. It is a young helper based on GPT-4 and GitHub Actions.

### What's so special about it?

**File-system Access:** Chota uses [Function Calling](https://openai.com/blog/function-calling-and-other-api-updates) to access filesystem, search internet, open webpages and read them for research.

**Self-correction tricks:** Current transformer models make many mistakes. To solve that: Chota uses multi-agent techniques. It uses one prompt to generate the solution to your given task and then it uses a different prompt to verify the solution.

**Git workflow:** Chota sends solution in a PR, you can ask it to iterate on the task using the GitHub issue itself. Chota will update the PR with the new solution by looking at older context and the newly requested updates.

### How to use it?
// TODO


## License
MIT

