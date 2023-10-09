const core = require('@actions/core');
const github = require('@actions/github');

//Get the JSON webhook payload for the event that triggered the workflow
const payload = JSON.stringify(github.context.payload, undefined, 2)
console.log(`The event payload: ${payload}`);

// LOG CURRENT ISSUE AND ALL COMMENTS HERE
const issueNumber = github.context.issue.number; // Fetch issue number from the event context
const owner = github.context.repo.owner;
const repo = github.context.repo.name;

const issue = await github.rest.issues.get({
  owner: owner,
  repo: repo,
  issue_number: issueNumber
});

console.log(`Issue: ${issue.data.title} by ${issue.data.user.login}`);

const comments = await github.rest.issues.listComments({
  owner: owner,
  repo: repo,
  issue_number: issueNumber
});

comments.data.forEach(comment => console.log(`${comment.user.login}: ${comment.body}`));