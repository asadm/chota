import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { reviewChange, reviewTerminalCommand, reviewAskQuestionFromUser } from '../agents/teamlead/index.mjs';
import kill from "tree-kill";
import axios from 'axios';
import {Readability} from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import puppeteer from 'puppeteer';
import { runPageQuestioner } from '../agents/pagequestioner/index.mjs';
import { askQuestionOnIssue } from './githubHelpers.mjs';

const serpApiKey = process.env.SERP_API_KEY;
const googleSearchEndpoint = 'https://serpapi.com/search';

export class DevEnvironment {
  constructor(rootPath, overallTaskContext, reviewRiskyChanges = false) {
    console.log('>', rootPath)
    this.rootPath = rootPath;
    this.overallTaskContext = overallTaskContext;
    this.browser = null;
    this.page = null;
    this.shellProcess = null;
    this.stdoutData = '';
    this.changeList = [];
    this.reviewRiskyChanges = reviewRiskyChanges;

    // Start the shell process when the DevEnvironment is created
    this.startShell();
  }

  startShell() {
    try {
      // Start a shell process (e.g., bash)
      console.log("Starting shell");
      let shellProcessConfig = {
        stdio: ['pipe', 'pipe', 'pipe'], // Set up stdio pipes for stdin, stdout, and stderr
      }
      if (!process.env.GITHUB_TOKEN) {
        // This seems to crash on github actions
        shellProcessConfig.cwd = this.rootPath;
      }
      this.shellProcess = spawn(process.env.SHELL || 'bash', [], shellProcessConfig);

      console.log("Shell started (I think)");

      this.shellProcess.stdout.on('data', (data) => {
                this.stdoutData += data.toString(); 
              });

      this.shellProcess.stderr.on('data', (data) => {
                this.stdoutData += data.toString(); 
      });

      this.shellProcess.on('exit', (code, signal) => {
        console.log(`Shell process exited with code ${code} and signal ${signal}`);
      });
    } catch (error) {
      console.log("Shell didnt start!!!", error);
      throw new Error(`Error starting shell: ${error.message}`);
    }
  }

  async GetTerminalText() {
        const lines = this.stdoutData.split('\n');
    const last100Lines = lines.length>100 ? lines.slice(Math.max(lines.length - 100, 0)).join('\n') : lines.join('\n');
    console.log("GetTerminalText", last100Lines);
    return last100Lines;
  }

  async WriteOnTerminal({ input, summary }) {
    // first review the change
    try{
      if (this.reviewRiskyChanges){
        await reviewTerminalCommand(summary, input, this.overallTaskContext);
        console.log("WriteOnTerminal approved");
      }
    }
    catch(e){
      throw new Error(`Code Reviewer rejected the change: ${e.message}`);
    }
    try {
      // Write the provided command to the terminal
      this.shellProcess.stdin.write(`${input}`);
      this.changeList.push({type: "WriteOnTerminal", input, summary});
      // sleep for 1 second to make sure the command is executed
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return `Input written on the terminal: ${input}`;
    } catch (error) {
      throw new Error(`Error writing on the terminal: ${error.message}`);
    }
  }

  async openBrowser() {
    try {
      this.browser = await puppeteer.launch({headless: "new"});
      this.page = await this.browser.newPage();
    } catch (error) {
      throw new Error(`Error opening browser: ${error.message}`);
    }
  }

  async closeBrowser() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
    } catch (error) {
      throw new Error(`Error closing browser: ${error.message}`);
    }
  }

  async OpenURLInBrowserAndAskQuestion({url, question}) {
    try {
      if (!this.page) {
        await this.openBrowser();
      }

      await this.page.goto(url);
      const data = await this.page.content();
      const doc = new JSDOM(data, {
        url,
      });

      const reader = new Readability(doc.window.document);
      const article = reader.parse();
      const turndownService = new TurndownService();
      const markdown = turndownService.turndown(article.content);
      const finalMarkdown =`# [${article.title}](${url})\n\n${markdown}`;

      // fs.writeFileSync('article.md', finalMarkdown);

      // answer the question
      const answer = await runPageQuestioner(url, finalMarkdown, question);

      return answer;
      

    } catch (error) {
      console.log(error);
      throw new Error(`Error opening URL in browser: ${error.message}`);
    }
  }

  async SearchOnInternet(query) {
    if (!serpApiKey){
      throw new Error("Search engine is offline.");
    }
    try {
      const response = await axios.get(googleSearchEndpoint, {
          params: {
              q: query,
              api_key: serpApiKey,
              engine: 'google'
          }
      });

      if (response.data) {
        const results = response.data.organic_results.map((result) => {
          return {
            title: result.title,
            url: result.link,
            description: result.snippet
          }
        });
        console.log("SearchOnInternet", results);
        return results;
      }
  } catch (error) {
      console.error('Error making the search request', error);
  }
  return null;
  }

  GetFileTree({ dirPath }) {
    try {
      const fullPath = path.join(this.rootPath, dirPath || '');
      const entries = fs.readdirSync(fullPath);
      const files = [];
      const folders = [];

      for (const entry of entries) {
        const entryPath = path.join(fullPath, entry);
        const stats = fs.statSync(entryPath);

        if (stats.isDirectory()) {
          folders.push(entry);
        } else {
          files.push(entry);
        }
      }

      return {
        root: fullPath.replace(this.rootPath, ''),
        files,
        folders,
      };
    } catch (error) {
      throw new Error(`Error getting file tree: ${error.message}`);
    }
  }

  GetFileTreeRecursive({dirPath}) {
    try {
      const getDirectoryContents = (dir) => {
        const entries = fs.readdirSync(dir);
        const files = [];
        const folders = [];

        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          const stats = fs.statSync(entryPath);

          if (stats.isDirectory()) {
            const subDirectory = getDirectoryContents(entryPath);
            folders.push({ name: entry, contents: subDirectory });
          } else {
            files.push(entry);
          }
        }

        return { files, folders };
      };

      const fullPath = path.join(this.rootPath, dirPath || '');


      const fileTree = getDirectoryContents(fullPath);

      const removeRootPathPrefix = (path) => path.replace(this.rootPath, '');

      const processTree = (tree) => {
        return {
          files: tree.files.map(removeRootPathPrefix),
          folders: tree.folders.map((folder) => ({
            name: removeRootPathPrefix(folder.name),
            contents: processTree(folder.contents),
          })),
        };
      };

      return {
        root: removeRootPathPrefix(this.rootPath),
        ...processTree(fileTree),
      };
    } catch (error) {
      throw new Error(`Error getting file tree: ${error.message}`);
    }
  }

  GetFileByPath({filePath}) {
    try {
      const fullPath = path.join(this.rootPath, filePath);
      return fs.readFileSync(fullPath, 'utf8');
    } catch (error) {
      console.log("GetFileByPath", error.message);
      // if file doesnt exist, check absolute path
      throw new Error(`Error reading file: ${error.message}`);
    }
  }

  async WriteToFile({filePath, content, summary}) {
    // first review the change
    let oldFile = "";
    try{
      oldFile = this.GetFileByPath({filePath});
    }
    catch(e){
      console.log("WriteToFile: File doesn't exist maybe?", e.message);
      // file doesnt exist, so its a new file
    }
    const change = {
      changeType: "WriteToFile",
      reason: summary,
      old: oldFile,
      new: content,
    }
    try{
      if (this.reviewRiskyChanges){
        console.log("going for review:",  filePath, summary, path.join(this.rootPath, filePath));
        const review = await reviewChange(change, this.overallTaskContext);
        console.log("change approved", review);
      }
    }
    catch(e){
      throw new Error(`Code Reviewer rejected the change: ${e.message}`);
    }

    // then write the file if approved
    try {
      console.log("WriteToFile", filePath, summary);
      const fullPath = path.join(this.rootPath, filePath);
      const dirPath = path.dirname(fullPath);

      // Create directories recursively if they don't exist
      fs.mkdirSync(dirPath, { recursive: true });

      // Write content to the file
      fs.writeFileSync(fullPath, content);
      console.log("WriteToFile", fullPath, "written");
      this.changeList.push({type: "WriteToFile", filePath, summary});
      return `File written successfully at: ${fullPath}`;
    } catch (error) {
      console.log("WriteToFile", error.message)
      throw new Error(`Error writing to file: ${error.message}`);
    }
  }

  async DeleteFile({filePath, summary}) {
    // first review the change
    const change = {
      changeType: "DeleteFile",
      reason: summary,
      old: this.GetFileByPath({filePath}),
      new: "",
    }
    try{
      if (this.reviewRiskyChanges){
        const review = await reviewChange(change);
        console.log("change approved", review);
      }
    }
    catch(e){
      throw new Error(`Code Reviewer rejected the change: ${e.message}`);
    }
    try {
      const fullPath = path.join(this.rootPath, filePath);
      fs.unlinkSync(fullPath);
      this.changeList.push({type: "DeleteFile", filePath, summary});
      return `File deleted successfully: ${fullPath}`;
    } catch (error) {
      throw new Error(`Error deleting file: ${error.message}`);
    }
  }

  RenameFile({oldPath, newPath}) {
    try {
      const oldFullPath = path.join(this.rootPath, oldPath);
      const newFullPath = path.join(this.rootPath, newPath);
      this.changeList.push({type: "DeleteFile", filePath: oldPath, summary: "Renaming file"});
      this.changeList.push({type: "WriteToFile", filePath: newPath, summary: "Renaming file"});
      fs.renameSync(oldFullPath, newFullPath);
      return `File renamed successfully from: ${oldFullPath} to ${newFullPath}`;
    } catch (error) {
      throw new Error(`Error renaming file: ${error.message}`);
    }
  }

  async AskQuestionFromUser({question}) {
    console.log("🤔", question);
    try{
        await reviewAskQuestionFromUser(this.overallTaskContext, question);
    }
    catch(e){
        return e.message;
    }

    // question is approved, so ask it
    await askQuestionOnIssue(question);
    
    // must exit for now
    process.exit(0);
  }

  getChangelistSummary(){
        if (this.changeList.length===0) return "No files were changed.";

    return this.changeList.map(c=>{
      return `${c.type}: ${c.filePath||c.input.trim()} (Reason: ${c.summary||"Unknown"})`
    }).join("\n");
  }

  // Clean up the shell process when the DevEnvironment is destroyed
  destroy() {
    if (this.shellProcess) {
      // this.shellProcess.kill();
      kill(this.shellProcess.pid);
    }
    if (this.page){
      this.closeBrowser();
    }
  }
}

// // Example usage:
// const devEnv = new DevEnvironment("/project/root");

// console.log(devEnv.getFileTree());
// console.log(devEnv.getFileByPath("file1.txt"));
// console.log(devEnv.writeToFile("newfile.txt", "New content"));
// console.log(devEnv.deleteFile("file1.txt"));
// console.log(devEnv.renameFile("oldfile.txt", "newfile.txt"));
