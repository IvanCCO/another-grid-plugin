Building a distraction‑free bookmarks reader for X

Goal

The goal is to build a Chrome extension that locks the user into the Bookmarks area of X (Twitter) and optionally hides all other UI elements so they can read saved content without distractions. The extension must work under Manifest V3 (MV3) using content scripts and cannot rely on the X API. It also requires a “Turn off the lights” mode to dim or hide everything except the main post or article. The extension will be written in TypeScript and packaged as a MV3 extension.

1 Chrome extension fundamentals
1.1 Manifest V3 components

An extension’s capabilities are declared in a manifest.json file. MV3 replaced MV2 with a focus on security and performance. Every MV3 manifest must include manifest_version: 3, a name, a version and optional keys such as action, content_scripts and background. Content scripts may be registered statically in the manifest by providing a list of JS/CSS files and a list of URL match patterns; they are injected automatically whenever a page matches the pattern. Each content script entry can specify:

matches: required array of match patterns that identify pages to inject into.
js: array of JavaScript files to inject.
css: array of CSS files to inject.
run_at: optional injection timing (document_start, document_end or document_idle).

MV3 uses a service worker instead of persistent background pages. Service workers handle events such as installation and user clicks and unload when idle. To inject scripts programmatically you can use the chrome.scripting API from the background service worker and request the scripting permission.

1.2 Permissions

MV3 emphasises minimal permissions. Each permission you request appears in the Chrome Web Store listing; fewer permissions increase trust. A practical guide on MV3 recommends using the activeTab permission instead of broad host permissions (such as <all_urls>). The activeTab permission allows the extension to run code only when the user invokes the extension (for example by clicking its icon) and does not show a permission warning. When persistent access is needed, limit the matches and host_permissions to specific domains (e.g., https://x.com/* and https://twitter.com/*) rather than using <all_urls>. MV3 also allows requesting optional permissions at run‑time using chrome.permissions.request().

1.3 Content scripts and isolated worlds

Content scripts run in an isolated world, meaning they share the DOM with the page but not its JavaScript environment. They can read and modify the DOM but cannot access variables defined on the page, so any complex logic (e.g., network requests) should be moved to the background service worker and communicated via message passing. Content scripts should not use eval() or remote code because MV3 prohibits remote code execution and inline scripts.

1.4 Dynamic pages and observers

Many modern sites, including X, are single‑page applications (SPAs). When a page navigates internally using the History API, content scripts are not re-injected. The Chrome documentation shows how to handle this: use a MutationObserver to watch for DOM changes and update the page accordingly. Observers should be scoped to the relevant container and used sparingly to avoid performance issues.

2 TypeScript development environment
2.1 Project structure

A typical MV3 extension project is organised as follows:

my-extension/
├── manifest.json            # MV3 manifest
├── background.ts / .js      # service worker (optional)
├── content.ts               # content script (TypeScript)
├── popup/                   # popup HTML/JS if needed
├── options/                 # options page if needed
└── icons/                   # extension icons (16×16, 48×48, 128×128)

The manifest must reside at the root of the project. Only manifest_version, name and version are required, but you will add more keys as needed (see Section 3).

2.2 Using TypeScript

To write the extension in TypeScript you need a build step that compiles TS to JS. A common setup is:

Initialize a project with a bundler like Vite or webpack. The Vite‐based workflow is well documented and provides fast builds for React/TypeScript extensions. Alternatively, use npm init to start a Node project and install typescript and a bundler (e.g., Rollup or esbuild).
Install type definitions: The Chrome team publishes chrome-types on npm, which provides auto‑completion and TypeScript definitions for Chrome APIs. You can also install @types/chrome for older definitions. Keep chrome-types updated to match the Chromium version.
Configure TypeScript (tsconfig.json): target ES2020 or later, enable sourceMap for debugging, and set module to esnext or iife depending on your bundler. Use the bundler to output compiled JS files into a dist directory.
Build script: Add an npm script (e.g., npm run build) that runs the bundler and copies static assets (manifest, icons, CSS) to the dist folder. During development, use tsc --watch or the bundler’s watch mode for live rebuilding.
2.3 Debugging and testing
Load the extension locally: Open chrome://extensions, enable Developer Mode, click Load unpacked and select the dist folder.
When you modify files, reload the extension: the manifest and service worker require a full reload. Content scripts need the host page to be refreshed to inject new code.
Use Chrome DevTools to debug content scripts (inspect the host page) and service workers (click Inspect views: service worker). Use the Errors button on the extensions page to view runtime errors.
For automated tests, you can use Puppeteer to run integration tests on the extension.
3 Designing the manifest

Below is a sketch of the manifest for the bookmarks‑only extension. You should adjust names, icons and file paths according to your project structure:

{
  "manifest_version": 3,
  "name": "X Bookmarks Reader",
  "version": "1.0.0",
  "description": "Turns X into a distraction‑free bookmarks reader.",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "permissions": ["storage"],
  "host_permissions": [
    "https://x.com/*",
    "https://twitter.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://x.com/*", "https://twitter.com/*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_title": "Turn off the lights",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  }
}

Explanation:

host_permissions restrict the extension to X’s domains instead of all URLs, reducing the privacy impact.
content_scripts register the compiled JS and CSS files that hide non‑bookmark UI. run_at: "document_idle" waits until the page has loaded to avoid interfering with initial rendering.
The background service worker can listen for action clicks, manage state and inject CSS when the user enables Turn off the lights using the chrome.scripting API.
The action key defines the toolbar button that toggles Turn off the lights.
4 Bookmarks‑only mode implementation
4.1 High‑level logic

The content script executes on every X page and performs the following steps:

Detect the current route: Use location.pathname to determine if the user is on /i/bookmarks (X’s bookmarks page). You may need to check both X and Twitter domains since they redirect.
Redirect to bookmarks: If the user navigates to non‑bookmark routes (Home, Notifications, Explore, etc.), either redirect them to /i/bookmarks or replace the page content with a minimal blocked‑state message. This ensures only the bookmarks UI is accessible.
Hide non‑bookmark elements: On the bookmarks page, remove or hide distracting elements such as sidebars, trending panels, ads, header nav and footers. You can use CSS selectors to target these elements and set display: none or apply visibility: hidden. Because content scripts run in an isolated world, you can modify the DOM directly.
Observe DOM changes: X is a SPA that updates its UI without full page reloads. Use a MutationObserver to watch relevant container nodes for new nodes and apply the same hiding logic to newly inserted elements. The Chrome tutorial warns that observers add overhead and should be scoped to the minimal subtree. Alternatively, use setInterval polling to periodically call your hide function.
Keep minimal CSS separate: Place CSS rules for hiding or dimming elements in content.css and inject them via the manifest. CSS injected via the manifest runs before content scripts, which prevents flash of unwanted UI.
4.2 DOM targeting example

Below is a simplified function that hides unwanted X UI. You should inspect X’s HTML structure to identify stable class names or ARIA roles; dynamic classes may change often, so prefer selectors based on roles (e.g., [aria-label="Home timeline"], [role="navigation"]).

function applyBookmarksOnlyMode() {
  const unwantedSelectors = [
    'header',                    // top navigation
    '[role="navigation"]',     // left navigation/sidebars
    '[aria-label="Timeline: Trending now"]',
    'div[aria-label="Trends"]',
    '[data-testid="sidebarColumn"]',
    '[data-testid="primaryColumn"] > div:first-child' // home feed container
  ];
  for (const selector of unwantedSelectors) {
    document.querySelectorAll<HTMLElement>(selector).forEach(el => {
      el.style.display = 'none';
    });
  }
}

applyBookmarksOnlyMode();

// Set up a MutationObserver to apply the hiding logic when the DOM updates
const observer = new MutationObserver(() => applyBookmarksOnlyMode());
observer.observe(document.body, { childList: true, subtree: true });

This function hides the selected elements and observes changes. On route changes, you can check location.pathname and call window.location.replace('/i/bookmarks') if necessary.

5 “Turn off the lights” mode

This mode dims everything except the main reading area. Implementing it cleanly requires a background service worker, message passing and dynamic CSS injection:

Service worker: Listen for the action (toolbar icon) click. Toggle a state variable stored in chrome.storage.sync so that the setting persists across tabs. Set the badge text accordingly (e.g., ON/OFF), as shown in the Focus Mode tutorial. Use the scripting API to insert or remove a CSS file that hides all elements except the post/article content.
CSS for dimming: Create a file dark-mode.css containing rules that hide or dim everything except the main content container (e.g., .css-1dbjc4n > div > div[role="main"]). An example pattern used in the Focus Mode tutorial displays nothing by default and then selectively reverts display for the article container and its descendants.
Toggle injection: In the service worker, respond to clicks by calling chrome.scripting.insertCSS() or chrome.scripting.removeCSS() for the current tab. This API requires the scripting permission.
Persist across navigations: Use a tabs.onUpdated listener in the service worker to reinsert the CSS if the tab changes URL but the mode is still enabled.
Messaging to content script: If you need the content script to adjust the UI (e.g., to collapse sidebars further when dark mode is on), send messages via chrome.runtime.sendMessage().
6 Best practices and compliance
Minimise permissions: Use activeTab when you can and restrict host patterns to X only. Avoid <all_urls> and request optional permissions at runtime when needed.
Separate concerns: Use the component model (content script, service worker, popup, options page) to keep logic organised. Content scripts should only manipulate the DOM; service workers handle events and network interactions.
Avoid performance pitfalls: Don’t use unload handlers or persistent WebSocket connections in content scripts; these can invalidate Chrome’s back/forward cache. Use a background service worker for long‑lived connections instead.
Respect privacy: Disclose what data your extension collects. For this bookmarks reader, you should not collect or transmit user data; the extension only modifies UI locally. Document this clearly in your privacy policy.
No remote code: MV3 prohibits executing code loaded from remote servers. All code must be bundled into the extension package. Avoid eval() and dynamically constructed functions.
Testing: Test the extension on different pages and X account states. Use Chrome’s Inspect to debug and Puppeteer for automated tests. Follow the Chrome DevTools tutorial for debugging popups and content scripts.
Update type definitions: Keep the chrome-types package up to date to ensure TypeScript accurately reflects the Chrome API.
Single Page Application handling: Because X uses a SPA, always handle internal route changes using MutationObserver or the popstate event. Without this, your extension might stop hiding new elements when the user navigates within the site.
7 Next steps
Prototype with static files: Start by writing a plain JavaScript version of the content script to hide elements and redirect to bookmarks. Once the logic works, port it to TypeScript.
Set up your build system: Initialize a Vite or webpack project, install typescript, chrome-types and any necessary dependencies, and configure the build script to output compiled files and copy static assets into a dist folder.
Develop and test: Use chrome://extensions to load the unpacked extension and test on X. Inspect the page to update selectors when X’s layout changes.
Implement Turn off the lights: Add a background service worker and CSS injection logic. Provide a user interface (toolbar button or popup) to toggle this mode and save the setting.
Prepare for publishing: Follow Chrome Web Store guidelines on icons, descriptions and privacy disclosures. Use high‑quality images and a clear listing.

By following these guidelines—using MV3 content scripts and the scripting API, respecting user privacy with minimal permissions, handling SPA navigation via observers, and setting up a TypeScript build pipeline—you can build a clean, distraction‑free bookmarks reader for X that hides unwanted content and enhances the reading experience.
