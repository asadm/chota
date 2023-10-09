import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { reviewChange, reviewTerminalCommand } from './teamlead/index.mjs';
import axios from 'axios';
import {Readability} from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import puppeteer from 'puppeteer';
import { runPageQuestioner } from './pagequestioner/index.mjs';

const serpApiKey = process.env.SERP_API_KEY;
const googleSearchEndpoint = 'https://serpapi.com/search';

export class DevEnvironment {
  constructor(rootPath, overallTaskContext) {
    console.log('>', rootPath)
    this.rootPath = rootPath;
    this.overallTaskContext = overallTaskContext;
    this.browser = null;
    this.page = null;
    this.shellProcess = null;
    this.stdoutData = ''; 

    // Start the shell process when the DevEnvironment is created
    this.startShell();
  }

  startShell() {
    try {
      // Start a shell process (e.g., bash)
      this.shellProcess = spawn('bash', [], {
        stdio: ['pipe', 'pipe', 'pipe'], // Set up stdio pipes for stdin, stdout, and stderr
        cwd: this.rootPath, // Set the current working directory
      });

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
      throw new Error(`Error starting shell: ${error.message}`);
    }
  }

  async GetTerminalText() {
    const lines = this.stdoutData.split('\n');
    const last100Lines = lines.slice(Math.max(lines.length - 100, 0)).join('\n');
    
    return last100Lines;
  }

  async WriteOnTerminal({ input, summary }) {
    // first review the change
    try{
      await reviewTerminalCommand(summary, input, this.overallTaskContext);
      console.log("WriteOnTerminal approved");
    }
    catch(e){
      throw new Error(`Code Reviewer rejected the change: ${e.message}`);
    }
    try {
      // Write the provided command to the terminal
      this.shellProcess.stdin.write(`${input}`);
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

  // async GetCurrentBrowserTabs() {
  //   try {
  //     if (!this.page) {
  //       throw new Error('Browser is not open');
  //     }

  //     const pages = await this.browser.pages();
  //     const tabs = [];

  //     for (const page of pages) {
  //       const title = await page.title();
  //       const pageUrl = page.url();
  //       tabs.push({ title, url: pageUrl });
  //     }

  //     return tabs;
  //   } catch (error) {
  //     throw new Error(`Error getting current browser tabs: ${error.message}`);
  //   }
  // }

  // async CloseBrowserTab(index) {
  //   try {
  //     if (!this.page) {
  //       throw new Error('Browser is not open');
  //     }

  //     const pages = await this.browser.pages();

  //     if (index >= 0 && index < pages.length) {
  //       const pageToClose = pages[index];
  //       await pageToClose.close();
  //       return `Closed browser tab at index ${index}`;
  //     } else {
  //       throw new Error(`Invalid tab index: ${index}`);
  //     }
  //   } catch (error) {
  //     throw new Error(`Error closing browser tab: ${error.message}`);
  //   }
  // }

  async SearchOnInternet(query) {
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
    //TODO: Doesnt write new file because it reads the file first
    // first review the change
    const change = {
      changeType: "WriteToFile",
      reason: summary,
      old: this.GetFileByPath({filePath}),
      new: content,
    }
    try{
      console.log("going for review:",  filePath, summary, path.join(this.rootPath, filePath));
      const review = await reviewChange(change, this.overallTaskContext);
      console.log("change approved", review);
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
      const review = await reviewChange(change);
      console.log("change approved", review);
    }
    catch(e){
      throw new Error(`Code Reviewer rejected the change: ${e.message}`);
    }
    try {
      const fullPath = path.join(this.rootPath, filePath);
      fs.unlinkSync(fullPath);
      return `File deleted successfully: ${fullPath}`;
    } catch (error) {
      throw new Error(`Error deleting file: ${error.message}`);
    }
  }

  RenameFile({oldPath, newPath}) {
    try {
      const oldFullPath = path.join(this.rootPath, oldPath);
      const newFullPath = path.join(this.rootPath, newPath);
      fs.renameSync(oldFullPath, newFullPath);
      return `File renamed successfully from: ${oldFullPath} to ${newFullPath}`;
    } catch (error) {
      throw new Error(`Error renaming file: ${error.message}`);
    }
  }

  // Clean up the shell process when the DevEnvironment is destroyed
  destroy() {
    if (this.shellProcess) {
      this.shellProcess.kill();
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
