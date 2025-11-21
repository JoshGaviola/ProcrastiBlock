// background.js - FIXED (URL blocker removed)

// Store the list of target URLs for automatic injection
const TARGET_URLS = [
    'https://joshgaviola.github.io/antiprocrastintor/',
    'https://joshgaviola.github.io/ProcrastiBlock/',
    'http://localhost/',
    'file:///'
];

// Check if a tab is one of our target tabs
function isTargetTab(tab) {
    if (!tab.url) return false;
    return TARGET_URLS.some(targetUrl => tab.url.startsWith(targetUrl));
}

// Main function: get all tabs and inject data into target tabs
function injectTitlesToTargetTab() {
    chrome.tabs.query({}, function(allTabs) {
        // Prepare the data to send: just titles and URLs
        const tabData = allTabs
            .filter(tab => tab.title && tab.url)
            .map(tab => ({ title: tab.title, url: tab.url }));

        // Find all target tabs and send them the data
        allTabs.forEach(tab => {
            if (isTargetTab(tab)) {
                chrome.tabs.sendMessage(tab.id, {
                    action: "injectTitles",
                    tabData: tabData
                }).catch(error => {
                    console.debug('Could not send message to tab:', tab.id, error);
                });
            }
        });
    });
}

// Debounce function to prevent excessive calls on rapid events
let debounceTimer;
function debouncedInjectTitles() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectTitlesToTargetTab, 100);
}

// Event listeners for automatic updates
chrome.tabs.onCreated.addListener(debouncedInjectTitles);
chrome.tabs.onRemoved.addListener(debouncedInjectTitles);
chrome.tabs.onUpdated.addListener(debouncedInjectTitles);

// Initial injection
chrome.runtime.onStartup.addListener(injectTitlesToTargetTab);
chrome.runtime.onInstalled.addListener(injectTitlesToTargetTab);

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getTabInfo") {
        chrome.tabs.query({}, function(tabs) {
            sendResponse({ tabs: tabs.map(tab => ({ title: tab.title, url: tab.url })) });
        });
        return true;
    }
});

// --- Blocking logic additions ---
let blockedUrls = [];
let allowedUrls = [];
let blockingEnabled = false;
let warningMode = false; // NEW
let timerMode = false; // NEW

chrome.storage.local.get({ blockedUrls: [], allowedUrls: [], blockingEnabled: false, warningMode: false, timerMode: false }, (data) => {
  blockedUrls = data.blockedUrls;
  allowedUrls = data.allowedUrls;
  blockingEnabled = data.blockingEnabled;
  warningMode = data.warningMode; // NEW
  timerMode = data.timerMode; // NEW
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.blockedUrls) blockedUrls = changes.blockedUrls.newValue || [];
    if (changes.allowedUrls) allowedUrls = changes.allowedUrls.newValue || [];
    if (changes.blockingEnabled) blockingEnabled = changes.blockingEnabled.newValue;
    if (changes.warningMode) warningMode = changes.warningMode.newValue; // NEW
    if (changes.timerMode) timerMode = changes.timerMode.newValue; // NEW
  }
});

// Blocking method using webRequest API
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (!blockingEnabled && !warningMode && !timerMode) {
      return { cancel: false };
    }

    const currentUrl = details.url;
    const isAllowed = allowedUrls.some(allowed => currentUrl.includes(allowed));
    if (isAllowed) {
      return { cancel: false };
    }

    const shouldBlock = blockedUrls.some(blockedUrl => currentUrl === blockedUrl);

    if (shouldBlock) {
      if (timerMode) {
        // Inject timer popup instead of blocking
        if (details.type === 'main_frame' && details.tabId >= 0) {
          chrome.storage.local.get(['timerDuration'], (result) => {
            const duration = result.timerDuration || 30; // Default to 30 seconds
            chrome.tabs.sendMessage(details.tabId, {
              action: 'showTimerPopup',
              duration: duration,
              url: currentUrl
            });
          });
        }
        return { cancel: false };
      }
      // Hard block (redirect)
      if (blockingEnabled) {
        return { redirectUrl: chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(currentUrl) };
      }
    }

    return { cancel: false };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Cleanup function
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateIrrelevantTabs") {
    console.log('Updating irrelevant tabs:', request.tabs);
    chrome.storage.local.set({ blockedUrls: request.tabs });
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});

// Periodically check for irrelevant tabs
setInterval(() => {
  chrome.tabs.query({
    url: [
      "file:///D:/project/web/ProcrastiBlock/index.html",
      "https://joshgaviola.github.io/ProcrastiBlock/"
    ]
  }, (tabs) => {
    if (tabs.length > 0) {
      console.log('Sending cleanup trigger to ProcrastiBlock tab');
      chrome.tabs.sendMessage(tabs[0].id, {action: "triggerCleanup"});
    }
  });
}, 5000);

// Remove unused message handlers (getWarningMode / updateIrrelevantTabs)
// Keep a single onMessage for getTabInfo only.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getTabInfo") {
    chrome.tabs.query({}, function(tabs) {
      sendResponse({ tabs: tabs.map(tab => ({ title: tab.title, url: tab.url })) });
    });
    return true;
  }
  return false;
});

// Ensure default allowed URLs are present
const DEFAULT_ALLOWED = [
  "https://www.youtube.com/",
  "https://www.google.com/"
];

// Utility to ensure defaults are present in allowedUrls
function ensureDefaultAllowed() {
  chrome.storage.local.get({ allowedUrls: [] }, (data) => {
    let allowedUrls = data.allowedUrls || [];
    let changed = false;
    DEFAULT_ALLOWED.forEach(url => {
      if (!allowedUrls.includes(url)) {
        allowedUrls.push(url);
        changed = true;
      }
    });
    if (changed) {
      chrome.storage.local.set({ allowedUrls });
    }
  });
}

// On install, set up allowedUrls with defaults if not present
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  chrome.storage.local.set({ 
    blockingEnabled: true,
    blockedUrls: []
  }, ensureDefaultAllowed);
});

// Also ensure on startup
chrome.runtime.onStartup.addListener(ensureDefaultAllowed);

// Handle extension icon click to show popup
chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});

const REQUIRED_URL = "https://joshgaviola.github.io/ProcrastiBlock/";

function ensureRequiredTabOpen() {
  chrome.tabs.query({}, function(tabs) {
    const found = tabs.some(tab => tab.url && tab.url.startsWith(REQUIRED_URL));
    if (!found) {
      chrome.tabs.create({ url: REQUIRED_URL, active: false });
    }
  });
}

chrome.runtime.onStartup.addListener(ensureRequiredTabOpen);
chrome.runtime.onInstalled.addListener(ensureRequiredTabOpen);