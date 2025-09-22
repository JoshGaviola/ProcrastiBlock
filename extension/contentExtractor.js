// This script runs only on the specific page and extracts tab titles to block
(function() {
  const currentPageUrl = window.location.href;
  let observer = null;
  let checkInterval = null;
  let cleanupInterval = null;
  let processedItems = new Set();
  
  console.log('Content extractor loaded on FocusGuard page');

  function initObserver() {
    const container = document.getElementById('tab-task-similarity');
    if (!container) {
      console.log('Container not found, retrying...');
      setTimeout(initObserver, 1000);
      return;
    }
    
    console.log('Container found, setting up observer');
    
    observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
          extractItemsFromNode(mutation.target);
        }
      });
    });
    
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
    
    extractItemsFromNode(container);
    
    checkInterval = setInterval(() => {
      extractItemsFromNode(container);
    }, 2000);
    
    cleanupInterval = setInterval(() => {
      cleanupBlockedItems();
    }, 3000);
  }
  
  function extractItemsFromNode(node) {
    const allDivs = node.querySelectorAll('div');
    const targetDivs = [];
    
    let foundIrrelevantSection = false;
    
    allDivs.forEach(div => {
      const text = div.textContent || '';
      
      if (text.includes('Irrelevant Tabs') && text.includes('similarity')) {
        foundIrrelevantSection = true;
        return;
      }
      
      if (foundIrrelevantSection) {
        if (text.includes('Summary:')) {
          foundIrrelevantSection = false;
          return;
        }
        targetDivs.push(div);
      }
    });
    
    const itemsToBlock = [];
    
    targetDivs.forEach(div => {
      const links = div.querySelectorAll('a');
      links.forEach(link => {
        const title = link.textContent.trim();
        const url = link.href;
        
        if (title && url && url !== currentPageUrl) {
          const itemId = title;
          if (!processedItems.has(itemId)) {
            itemsToBlock.push(title);
            processedItems.add(itemId);
            console.log('Adding to blocklist:', title);
          }
        }
      });
    });

    if (itemsToBlock.length > 0) {
      addItemsToBlockList(itemsToBlock);
    }
  }
  
  function addItemsToBlockList(itemsToBlock) {
    chrome.storage.local.get(['blockedUrls'], (result) => {
      const blockedUrls = result.blockedUrls || [];
      const newItems = itemsToBlock.filter(title => 
        !blockedUrls.includes(title)
      );
      
      if (newItems.length > 0) {
        chrome.storage.local.set({
          blockedUrls: [...blockedUrls, ...newItems]
        });
        console.log('Added new items to blocklist:', newItems);
      }
    });
  }
  
  function cleanupBlockedItems() {
    console.log('=== CLEANUP STARTED ===');
    
    const currentIrrelevantTitles = getCurrentIrrelevantTitles();
    console.log('Current irrelevant titles:', Array.from(currentIrrelevantTitles));

    chrome.storage.local.get(['blockedUrls'], (result) => {
      const blockedUrls = result.blockedUrls || [];
      console.log('Currently blocked:', blockedUrls);

      const urlsToKeep = blockedUrls.filter(title => {
        return currentIrrelevantTitles.has(title);
      });

      if (urlsToKeep.length !== blockedUrls.length) {
        chrome.storage.local.set({
          blockedUrls: urlsToKeep
        }, () => {
          console.log('Cleanup completed. Removed', blockedUrls.length - urlsToKeep.length, 'items');
          processedItems = new Set(urlsToKeep);
        });
      }
    });
  }
  
  function getCurrentIrrelevantTitles() {
    const irrelevantTitles = new Set();
    const container = document.getElementById('tab-task-similarity');
    if (!container) {
      return irrelevantTitles;
    }

    const irrelevantHeader = Array.from(container.querySelectorAll('div')).find(div => 
      div.textContent.includes('Irrelevant Tabs') && div.textContent.includes('similarity')
    );

    if (!irrelevantHeader) {
      return irrelevantTitles;
    }

    let currentElement = irrelevantHeader.nextElementSibling;
    while (currentElement && !currentElement.textContent.includes('Summary:')) {
      if (currentElement.tagName === 'DIV' && currentElement.querySelector('a')) {
        const link = currentElement.querySelector('a');
        const title = link.textContent.trim();
        if (title) {
          irrelevantTitles.add(title);
        }
      }
      currentElement = currentElement.nextElementSibling;
    }

    return irrelevantTitles;
  }

  // Listen for messages from background or popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "triggerCleanup") {
      console.log('Cleanup triggered by background');
      cleanupBlockedItems();
    }
    if (request.action === "triggerExtraction") {
      console.log('Extraction triggered by popup');
      const container = document.getElementById('tab-task-similarity');
      if (container) {
        extractItemsFromNode(container);
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
  } else {
    initObserver();
  }
  
  window.addEventListener('beforeunload', () => {
    if (observer) observer.disconnect();
    if (checkInterval) clearInterval(checkInterval);
    if (cleanupInterval) clearInterval(cleanupInterval);
  });
})();