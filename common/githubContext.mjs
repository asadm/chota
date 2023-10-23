import { Octokit } from "@octokit/rest";
import { localContext } from "../localcontext.mjs";

export async function getContextFromIssue() {
  if (!process.env.GITHUB_TOKEN) {
    console.log("No GITHUB_TOKEN found, using local context.");
    return localContext;
  }
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const context = {
    owner: process.env.GITHUB_REPOSITORY.split('/')[0],
    repo: process.env.GITHUB_REPOSITORY.split('/')[1],
    issue_number: process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH).issue.number : undefined,
    per_page: 100
  };

  if (!context.issue_number) {
    console.log("No issue number found!");
    return;
  }

  // Get the issue
  const issue = await octokit.rest.issues.get(context);

  // Log the issue
  console.log(`Issue by ${issue.data.user.login}: ${issue.data.body}`);

  // Get issue comments
  const comments = await octokit.rest.issues.listComments(context);

  // Log the comments
  let lastUserCommentId;
  comments.data.forEach(comment => {
    if (comment.user.login.indexOf('[bot]') === -1) {
      lastUserCommentId = comment.id;
    }
  });

  let finalContext = 'Context:\nOLD MESSAGES:\n';
  comments.data.forEach(comment => {
    if (comment.id === lastUserCommentId) {
      finalContext += `NEW MESSAGES:\n`;
    }
    if (comment.user.login.indexOf('[bot]') === -1) {
      finalContext += `User: ${comment.body}\n`;
    }
    else{
      finalContext += `You: ${comment.body}\n`;
    }
  });

  return finalContext;
}

// getContextFromIssue().catch(error => {
//   console.error(error);
// });
