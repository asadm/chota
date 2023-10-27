<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/asadm/chota">
    <img src="header.png" alt="Chota">
  </a>


  <p align="center">
    Chota [cho-taa]: Small • Apprentice • Helper for trivial tasks
    <br />
    <br />
    <a href="https://github.com/asadm/chota/issues">Report Bug</a>
    ·
    <a href="https://github.com/asadm/chota/issues">Request Feature</a>
  </p>
</div>

## About The Project

Chota is a developer that lives in your GitHub repo. You can assign it trivial coding tasks using Github Issues and it sends Pull Request with the solution. It is a young helper based on GPT-4 and GitHub Actions that can read your existing codebase, search the internet for research and question itself to avoid mistakes.

### What's so special about it?

**File-system Access:** Chota uses [Function Calling](https://openai.com/blog/function-calling-and-other-api-updates) to access filesystem, search internet, open webpages and read them for research. Given a task, it can use these functions to read your existing codebase and search the internet for research.

**Self-correction tricks:** Current GPT models make mistakes when writing code. To solve that: Chota uses multi-agent techniques. It uses one prompt to generate the solution to your given task and then it uses a different prompt to verify the solution.

**Git workflow:** Chota sends solution in a PR, you can ask it to iterate on the task using the GitHub issue itself. Chota will update the PR with the new solution by looking at older context and the newly requested updates.

### How to use it?
// TODO


## License
MIT

