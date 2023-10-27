import { Octokit } from "@octokit/rest";
import { localContext } from "../localcontext.mjs";
import fs from 'fs';

export async function getContextFromIssue() {
  if (!process.env.GITHUB_TOKEN) {
    console.log("No GITHUB_TOKEN found, using local context.");
    return localContext;
  }
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
  let issue_number;

  if (process.env.GITHUB_EVENT_PATH) {
    try {
      const eventData = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      issue_number = eventData.issue?.number;
    } catch (error) {
      console.error('Failed to read or parse the GITHUB_EVENT_PATH:', error);
    }
  }

  const context = {
    owner: process.env.GITHUB_REPOSITORY.split('/')[0],
    repo: process.env.GITHUB_REPOSITORY.split('/')[1],
    issue_number: issue_number,
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
    else {
      finalContext += `You: ${comment.body}\n`;
    }
  });

  return finalContext;
}

export async function askQuestionOnIssue(question) {
  if (!process.env.GITHUB_TOKEN) {
    console.log("No GITHUB_TOKEN found, please modify localcontext.mjs to answer the question and rerun.");
    return;
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  let issue_number;

  if (process.env.GITHUB_EVENT_PATH) {
    try {
      const eventData = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      issue_number = eventData.issue?.number;
    } catch (error) {
      console.error('Failed to read or parse the GITHUB_EVENT_PATH:', error);
      return;
    }
  }

  if (!issue_number) {
    console.log("No issue number found!");
    return;
  }

  const context = {
    owner: process.env.GITHUB_REPOSITORY.split('/')[0],
    repo: process.env.GITHUB_REPOSITORY.split('/')[1],
    issue_number: issue_number,
    body: question
  };

  try {
    await octokit.rest.issues.createComment(context);
    console.log("Question posted to the issue successfully!");
  } catch (error) {
    console.error('Failed to post the question to the issue:', error);
  }
}
