import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium, firefox, webkit, Browser, Page, BrowserContext } from "playwright";
import { z } from "zod";

const server = new Server(
  {
    name: "playwright",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

const browserTypeSchema = z.enum(["chromium", "firefox", "webkit"]);

const tools: Tool[] = [
  {
    name: "browser_launch",
    description: "Launch a new browser instance",
    inputSchema: {
      type: "object",
      properties: {
        browserType: {
          type: "string",
          enum: ["chromium", "firefox", "webkit"],
          description: "Browser engine to use",
          default: "chromium",
        },
        headless: {
          type: "boolean",
          description: "Run in headless mode",
          default: true,
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Additional browser arguments",
        },
      },
      required: [],
    },
  },
  {
    name: "browser_close",
    description: "Close the browser and all pages",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "page_new",
    description: "Create a new page in the current context",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "page_goto",
    description: "Navigate to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle", "commit"],
          default: "load",
        },
        timeout: { type: "number", default: 30000 },
      },
      required: ["url"],
    },
  },
  {
    name: "page_click",
    description: "Click an element",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        button: { type: "string", enum: ["left", "right", "middle"], default: "left" },
        clickCount: { type: "number", default: 1 },
        delay: { type: "number" },
        timeout: { type: "number", default: 30000 },
      },
      required: ["selector"],
    },
  },
  {
    name: "page_fill",
    description: "Fill an input field",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        value: { type: "string", description: "Value to fill" },
        timeout: { type: "number", default: 30000 },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "page_type",
    description: "Type text into an element",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        text: { type: "string", description: "Text to type" },
        delay: { type: "number" },
        timeout: { type: "number", default: 30000 },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "page_press",
    description: "Press a key",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector (optional)" },
        key: { type: "string", description: "Key to press" },
        delay: { type: "number" },
        timeout: { type: "number", default: 30000 },
      },
      required: ["key"],
    },
  },
  {
    name: "page_wait_for_selector",
    description: "Wait for an element to appear",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        state: { type: "string", enum: ["attached", "detached", "visible", "hidden"], default: "visible" },
        timeout: { type: "number", default: 30000 },
      },
      required: ["selector"],
    },
  },
  {
    name: "page_screenshot",
    description: "Take a screenshot",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to save screenshot" },
        fullPage: { type: "boolean", default: false },
        quality: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["path"],
    },
  },
  {
    name: "page_evaluate",
    description: "Evaluate JavaScript in the page context",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to evaluate" },
      },
      required: ["script"],
    },
  },
  {
    name: "page_get_content",
    description: "Get page HTML content",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "page_get_title",
    description: "Get page title",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "page_get_url",
    description: "Get current page URL",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "page_select_option",
    description: "Select option(s) in a select element",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        values: { type: "array", items: { type: "string" }, description: "Option values to select" },
        timeout: { type: "number", default: 30000 },
      },
      required: ["selector", "values"],
    },
  },
  {
    name: "page_hover",
    description: "Hover over an element",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        timeout: { type: "number", default: 30000 },
      },
      required: ["selector"],
    },
  },
  {
    name: "page_drag_and_drop",
    description: "Drag and drop elements",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Source element selector" },
        target: { type: "string", description: "Target element selector" },
        timeout: { type: "number", default: 30000 },
      },
      required: ["source", "target"],
    },
  },
  {
    name: "page_wait_for_load_state",
    description: "Wait for page load state",
    inputSchema: {
      type: "object",
      properties: {
        state: { type: "string", enum: ["load", "domcontentloaded", "networkidle"], default: "load" },
        timeout: { type: "number", default: 30000 },
      },
      required: [],
    },
  },
  {
    name: "page_go_back",
    description: "Go back in history",
    inputSchema: {
      type: "object",
      properties: {
        timeout: { type: "number", default: 30000 },
      },
      required: [],
    },
  },
  {
    name: "page_go_forward",
    description: "Go forward in history",
    inputSchema: {
      type: "object",
      properties: {
        timeout: { type: "number", default: 30000 },
      },
      required: [],
    },
  },
  {
    name: "page_reload",
    description: "Reload the page",
    inputSchema: {
      type: "object",
      properties: {
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle", "commit"],
          default: "load",
        },
        timeout: { type: "number", default: 30000 },
      },
      required: [],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "browser_launch": {
        const { browserType = "chromium", headless = true, args: browserArgs = [] } = args as {
          browserType?: string;
          headless?: boolean;
          args?: string[];
        };

        if (browser) {
          await browser.close();
        }

        const launchOptions = { headless, args: browserArgs };
        switch (browserType) {
          case "firefox":
            browser = await firefox.launch(launchOptions);
            break;
          case "webkit":
            browser = await webkit.launch(launchOptions);
            break;
          default:
            browser = await chromium.launch(launchOptions);
        }

        context = await browser.newContext();
        page = await context.newPage();

        return {
          content: [{ type: "text", text: `Browser launched: ${browserType} (headless: ${headless})` }],
        };
      }

      case "browser_close": {
        if (browser) {
          await browser.close();
          browser = null;
          context = null;
          page = null;
        }
        return {
          content: [{ type: "text", text: "Browser closed" }],
        };
      }

      case "page_new": {
        if (!context) {
          throw new Error("No browser context. Launch browser first.");
        }
        page = await context.newPage();
        return {
          content: [{ type: "text", text: "New page created" }],
        };
      }

      case "page_goto": {
        if (!page) throw new Error("No page. Create a page first.");
        const { url, waitUntil = "load", timeout = 30000 } = args as {
          url: string;
          waitUntil?: string;
          timeout?: number;
        };
        await page.goto(url, { waitUntil: waitUntil as any, timeout });
        return {
          content: [{ type: "text", text: `Navigated to ${url}` }],
        };
      }

      case "page_click": {
        if (!page) throw new Error("No page. Create a page first.");
        const { selector, button = "left", clickCount = 1, delay, timeout = 30000 } = args as {
          selector: string;
          button?: string;
          clickCount?: number;
          delay?: number;
          timeout?: number;
        };
        await page.click(selector, { button: button as any, clickCount, delay, timeout });
        return {
          content: [{ type: "text", text: `Clicked ${selector}` }],
        };
      }

      case "page_fill": {
        if (!page) throw new Error("No page. Create a page first.");
        const { selector, value, timeout = 30000 } = args as {
          selector: string;
          value: string;
          timeout?: number;
        };
        await page.fill(selector, value, { timeout });
        return {
          content: [{ type: "text", text: `Filled ${selector} with "${value}"` }],
        };
      }

      case "page_type": {
        if (!page) throw new Error("No page. Create a page first.");
        const { selector, text, delay, timeout = 30000 } = args as {
          selector: string;
          text: string;
          delay?: number;
          timeout?: number;
        };
        await page.type(selector, text, { delay, timeout });
        return {
          content: [{ type: "text", text: `Typed "${text}" into ${selector}` }],
        };
      }

      case "page_press": {
        if (!page) throw new Error("No page. Create a page first.");
        const { selector, key, delay, timeout = 30000 } = args as {
          selector?: string;
          key: string;
          delay?: number;
          timeout?: number;
        };
        if (selector) {
          await page.press(selector, key, { delay, timeout });
        } else {
          await page.keyboard.press(key, { delay });
        }
        return {
          content: [{ type: "text", text: `Pressed ${key}${selector ? ` on ${selector}` : ""}` }],
        };
      }

      case "page_wait_for_selector": {
        if (!page) throw new Error("No page. Create a page first.");
        const { selector, state = "visible", timeout = 30000 } = args as {
          selector: string;
          state?: string;
          timeout?: number;
        };
        await page.waitForSelector(selector, { state: state as any, timeout });
        return {
          content: [{ type: "text", text: `Element ${selector} is ${state}` }],
        };
      }

      case "page_screenshot": {
        if (!page) throw new Error("No page. Create a page first.");
        const { path, fullPage = false, quality } = args as {
          path: string;
          fullPage?: boolean;
          quality?: number;
        };
        await page.screenshot({ path, fullPage, quality });
        return {
          content: [{ type: "text", text: `Screenshot saved to ${path}` }],
        };
      }

      case "page_evaluate": {
        if (!page) throw new Error("No page. Create a page first.");
        const { script } = args as { script: string };
        const result = await page.evaluate(script);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "page_get_content": {
        if (!page) throw new Error("No page. Create a page first.");
        const content = await page.content();
        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "page_get_title": {
        if (!page) throw new Error("No page. Create a page first.");
        const title = await page.title();
        return {
          content: [{ type: "text", text: title }],
        };
      }

      case "page_get_url": {
        if (!page) throw new Error("No page. Create a page first.");
        const url = page.url();
        return {
          content: [{ type: "text", text: url }],
        };
      }

      case "page_select_option": {
        if (!page) throw new Error("No page. Create a page first.");
        const { selector, values, timeout = 30000 } = args as {
          selector: string;
          values: string[];
          timeout?: number;
        };
        await page.selectOption(selector, values, { timeout });
        return {
          content: [{ type: "text", text: `Selected ${values.join(", ")} in ${selector}` }],
        };
      }

      case "page_hover": {
        if (!page) throw new Error("No page. Create a page first.");
        const { selector, timeout = 30000 } = args as {
          selector: string;
          timeout?: number;
        };
        await page.hover(selector, { timeout });
        return {
          content: [{ type: "text", text: `Hovered ${selector}` }],
        };
      }

      case "page_drag_and_drop": {
        if (!page) throw new Error("No page. Create a page first.");
        const { source, target, timeout = 30000 } = args as {
          source: string;
          target: string;
          timeout?: number;
        };
        await page.dragAndDrop(source, target, { timeout });
        return {
          content: [{ type: "text", text: `Dragged ${source} to ${target}` }],
        };
      }

      case "page_wait_for_load_state": {
        if (!page) throw new Error("No page. Create a page first.");
        const { state = "load", timeout = 30000 } = args as {
          state?: string;
          timeout?: number;
        };
        await page.waitForLoadState(state as any, { timeout });
        return {
          content: [{ type: "text", text: `Page load state: ${state}` }],
        };
      }

      case "page_go_back": {
        if (!page) throw new Error("No page. Create a page first.");
        const { timeout = 30000 } = args as { timeout?: number };
        await page.goBack({ timeout });
        return {
          content: [{ type: "text", text: "Went back" }],
        };
      }

      case "page_go_forward": {
        if (!page) throw new Error("No page. Create a page first.");
        const { timeout = 30000 } = args as { timeout?: number };
        await page.goForward({ timeout });
        return {
          content: [{ type: "text", text: "Went forward" }],
        };
      }

      case "page_reload": {
        if (!page) throw new Error("No page. Create a page first.");
        const { waitUntil = "load", timeout = 30000 } = args as {
          waitUntil?: string;
          timeout?: number;
        };
        await page.reload({ waitUntil: waitUntil as any, timeout });
        return {
          content: [{ type: "text", text: "Page reloaded" }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Playwright MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});