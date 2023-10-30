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

To use Chota, follow the below steps:

- Add the following `workflow.yml` file to the `.github/workflows` directory of your repo:
```yaml
name: Chota Action

on:
  issues:
    types: [opened, edited]
  issue_comment:
    types: [created, edited]

jobs:
  branch-actions:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: asadm/chota@3b117de11ebc90e7117895fbad57203c940cba05
      with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          SERP_API_KEY: ${{ secrets.SERP_API_KEY }}
```

- In your GitHub repo, go to `Settings` > `Actions`. Under `Workflow Permissions`, toggle on `Read & write permissions`.

- Chota uses OpenAI and SERP API, so you will need to get API keys from these providers. Here are the steps to add these keys to your GitHub repository secrets:
  1. Generate the API key from OpenAI and SERP API.
  2. Go to your GitHub repository.
  3. In the upper-right corner, click `Settings`.
  4. In the left sidebar, click `Secrets`.
  5. Click `New repository secret`.
  6. Enter a name for the secret in the `Name` field, such as `OPENAI_API_KEY` or `SERP_API_KEY`.
  7. Paste your API key into the `Value` field.
  8. Click `Add secret` to save.

  Note: Currently, the process of obtaining an API key from SERP API is not clearly documented on their website. You may need to contact SERP API's support for detailed instructions.

- Once the above steps are done, you can create a new issue in your repository. Label it 'chota' and describe your task in the issue body.


## License
MIT

