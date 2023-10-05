import fs from 'fs';
import path from 'path';
import { reviewChange } from './teamlead/index.mjs';
export class DevEnvironment {
  constructor(rootPath) {
    console.log('rootPath', rootPath)
    this.rootPath = rootPath;
    this.browser = null;
    this.page = null;
  }

  async openBrowser() {
    try {
      this.browser = await puppeteer.launch();
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

  async OpenURLInBrowser(url) {
    try {
      if (!this.page) {
        await this.openBrowser();
      }

      await this.page.goto(url);

      return `Opened URL in the browser: ${url}`;
    } catch (error) {
      throw new Error(`Error opening URL in browser: ${error.message}`);
    }
  }

  async GetCurrentBrowserTabs() {
    try {
      if (!this.page) {
        throw new Error('Browser is not open');
      }

      const pages = await this.browser.pages();
      const tabs = [];

      for (const page of pages) {
        const title = await page.title();
        const pageUrl = page.url();
        tabs.push({ title, url: pageUrl });
      }

      return tabs;
    } catch (error) {
      throw new Error(`Error getting current browser tabs: ${error.message}`);
    }
  }

  async CloseBrowserTab(index) {
    try {
      if (!this.page) {
        throw new Error('Browser is not open');
      }

      const pages = await this.browser.pages();

      if (index >= 0 && index < pages.length) {
        const pageToClose = pages[index];
        await pageToClose.close();
        return `Closed browser tab at index ${index}`;
      } else {
        throw new Error(`Invalid tab index: ${index}`);
      }
    } catch (error) {
      throw new Error(`Error closing browser tab: ${error.message}`);
    }
  }

  async SearchOnInternet(query) {
    try {
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      await this.OpenURLInBrowser(googleSearchUrl);
      const searchResults = await this.page.$$eval('.rc', (results) => {
        return results.map((result) => {
          const title = result.querySelector('h3').textContent;
          const description = result.querySelector('.s').textContent;
          const url = result.querySelector('.r a').href;
          return { title, description, url };
        });
      });

      return searchResults;
    } catch (error) {
      throw new Error(`Error searching on the internet: ${error.message}`);
    }
  }

  GetFileTree() {
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

      const fileTree = getDirectoryContents(this.rootPath);

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
      // if file doesnt exist, check absolute path
      throw new Error(`Error reading file: ${error.message}`);
    }
  }

  async WriteToFile({filePath, content, summary}) {
    // first review the change
    const change = {
      changeType: "WriteToFile",
      reason: summary,
      old: this.GetFileByPath({filePath}),
      new: content,
    }
    try{
      const review = await reviewChange(change);
      console.log("change approved", review);
    }
    catch(e){
      throw new Error(`Code Reviewer rejected the change: ${e.message}`);
    }
    try {
      console.log("WriteToFile", filePath, summary);
      const fullPath = path.join(this.rootPath, filePath);
      const dirPath = path.dirname(fullPath);

      // Create directories recursively if they don't exist
      fs.mkdirSync(dirPath, { recursive: true });

      // Write content to the file
      fs.writeFileSync(fullPath, content);
      return `File written successfully at: ${fullPath}`;
    } catch (error) {
      throw new Error(`Error writing to file: ${error.message}`);
    }
  }

  DeleteFile({filePath}) {
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
}

// // Example usage:
// const devEnv = new DevEnvironment("/project/root");

// console.log(devEnv.getFileTree());
// console.log(devEnv.getFileByPath("file1.txt"));
// console.log(devEnv.writeToFile("newfile.txt", "New content"));
// console.log(devEnv.deleteFile("file1.txt"));
// console.log(devEnv.renameFile("oldfile.txt", "newfile.txt"));
