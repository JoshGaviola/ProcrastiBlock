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

// Load initial values from storage
chrome.storage.local.get({ blockedUrls: [], allowedUrls: [], blockingEnabled: false }, (data) => {
  blockedUrls = data.blockedUrls;
  allowedUrls = data.allowedUrls;
  blockingEnabled = data.blockingEnabled;
  console.log('Background script loaded. Blocking:', blockingEnabled, 'Blocked:', blockedUrls, 'Allowed:', allowedUrls);
});

// Keep values in sync when popup updates them
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.blockedUrls) {
      blockedUrls = changes.blockedUrls.newValue || [];
      console.log('Blocked URLs updated:', blockedUrls);
    }
    if (changes.allowedUrls) {
      allowedUrls = changes.allowedUrls.newValue || [];
      console.log('Allowed URLs updated:', allowedUrls);
    }
    if (changes.blockingEnabled) {
      blockingEnabled = changes.blockingEnabled.newValue;
      console.log('Blocking enabled:', blockingEnabled);
    }
  }
});

// Blocking method using webRequest API, skip allowedUrls
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (!blockingEnabled) {
      return { cancel: false };
    }

    const currentUrl = details.url;
    // If allowedUrls matches, do NOT block
    const isAllowed = allowedUrls.some(allowed => currentUrl.includes(allowed));
    if (isAllowed) {
      return { cancel: false };
    }

    const shouldBlock = blockedUrls.some(blockedTitle => 
      currentUrl.includes(blockedTitle)
    );

    if (shouldBlock) {
      console.log('Blocking request to:', currentUrl);
      return { redirectUrl: chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(currentUrl) };
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
  chrome.tabs.query({url: "file:///D:/project/web/ProcrastiBlock/index.html" || "https://joshgaviola.github.io/ProcrastiBlock/"}, (tabs) => {
    if (tabs.length > 0) {
      console.log('Sending cleanup trigger to FocusGuard tab');
      chrome.tabs.sendMessage(tabs[0].id, {action: "triggerCleanup"});
    }
  });
}, 5000);

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  chrome.storage.local.set({ 
    blockingEnabled: true,
    blockedUrls: [] 
  });
});

// Handle extension icon click to show popup
chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});