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
  chrome.tabs.query({url: "file:///D:/project/web/extensions/procrastiguard/index.html"}, (tabs) => {
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