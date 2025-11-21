document.addEventListener('DOMContentLoaded', function() {
  // const tabList = document.getElementById('tabList'); // removed (unused)
  const refreshBtn = document.getElementById('refreshBtn');
  const injectBtn = document.getElementById('injectBtn');

  // DROPDOWN TAB LIST REPLACEMENT
  const tabsToggle = document.getElementById('tabsToggle');
  const tabsPanel = document.getElementById('tabsPanel');
  const tabListEl = document.getElementById('tabDropdownList');
  const tabCountSpan = document.getElementById('tabCount');

  tabsToggle.addEventListener('click', () => {
    const open = tabsPanel.style.display === 'block';
    tabsPanel.style.display = open ? 'none' : 'block';
    tabsToggle.textContent = `All Open Tabs (${tabCountSpan.textContent}) ${open ? '▸' : '▾'}`;
  });

  function loadTabTitles() {
    chrome.tabs.query({}, function(tabs) {
      tabListEl.innerHTML = '';
      let count = 0;
      tabs.forEach(tab => {
        if (tab.title && tab.url) {
          count++;
          const li = document.createElement('li');
          const label = tab.title.length > 80 ? tab.title.substring(0,77) + '…' : tab.title;
          li.textContent = label;
          li.title = tab.title;
          li.dataset.tabId = tab.id;
          li.dataset.url = tab.url;
          li.addEventListener('click', () => {
            const id = parseInt(li.dataset.tabId, 10);
            chrome.tabs.update(id, { active: true });
            tabsPanel.style.display = 'none';
            tabsToggle.textContent = `All Open Tabs (${count}) ▸`;
          });
          tabListEl.appendChild(li);
        }
      });
      tabCountSpan.textContent = count;
      const currentlyOpen = tabsPanel.style.display === 'block';
      tabsToggle.textContent = `All Open Tabs (${count}) ${currentlyOpen ? '▾' : '▸'}`;
    });
  }

  function getTabTitlesArray() {
    const titles = [];
    tabListEl.querySelectorAll('li').forEach(li => titles.push(li.title));
    return titles;
  }

  // Load tab titles when popup opens
  loadTabTitles();
  refreshBtn.addEventListener('click', loadTabTitles);

  injectBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "injectTitles",
        tabTitles: getTabTitlesArray()
      }, function(response) {
        if (response && response.status === "success") {
          alert("Tab titles injected successfully!");
        } else {
          alert("Failed to inject titles. Make sure you're on the ProcrastiBlock page.");
        }
      });
    });
  });

  // Load current blocklist and enabled state
  function refreshList() {
    chrome.storage.local.get(['blockedUrls', 'allowedUrls', 'blockingEnabled'], (result) => {
      // Blocked list
      const list = document.getElementById('urlList');
      list.innerHTML = '';
      document.getElementById('blockingEnabled').checked = result.blockingEnabled !== false;
      const displayItems = result.blockedUrls || [];
      if (displayItems.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No blocked items';
        li.style.color = '#999';
        li.style.cursor = 'default';
        list.appendChild(li);
      } else {
        displayItems.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item.length > 50 ? item.substring(0, 47) + '...' : item;
          li.title = item;
          li.style.cursor = 'pointer';
          li.onclick = () => {
            const newList = result.blockedUrls.filter(u => u !== item);
            chrome.storage.local.set({blockedUrls: newList}, refreshList);
          };
          list.appendChild(li);
        });
      }

      // Allowed list
      const allowedList = document.getElementById('allowedList');
      allowedList.innerHTML = '';
      const allowedItems = result.allowedUrls || [];
      if (allowedItems.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No allowed items';
        li.style.color = '#999';
        li.style.cursor = 'default';
        allowedList.appendChild(li);
      } else {
        allowedItems.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item.length > 50 ? item.substring(0, 47) + '...' : item;
          li.title = item;
          li.style.cursor = 'pointer';
          li.onclick = () => {
            const newList = allowedItems.filter(u => u !== item);
            chrome.storage.local.set({allowedUrls: newList}, refreshList);
          };
          allowedList.appendChild(li);
        });
      }
    });
  }

  // Toggle blocking on/off
  document.getElementById('blockingEnabled').onchange = (e) => {
    chrome.storage.local.set({blockingEnabled: e.target.checked}, () => {
      console.log('Blocking enabled:', e.target.checked);
      // Refresh all tabs when blocking is toggled
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.url && !tab.url.includes('chrome://')) {
            chrome.tabs.reload(tab.id);
          }
        });
      });
    });
  };

  // Add new URL to blocklist
  document.getElementById('addBtn').onclick = () => {
    const url = document.getElementById('newUrl').value.trim();
    if (url) {
      chrome.storage.local.get(['blockedUrls'], (result) => {
        const blockedUrls = result.blockedUrls || [];
        if (!blockedUrls.includes(url)) {
          blockedUrls.push(url);
          chrome.storage.local.set({blockedUrls: blockedUrls}, () => {
            document.getElementById('newUrl').value = '';
            refreshList();
            console.log('Added to blocklist:', url);
          });
        }
      });
    }
  };

  // Add new allowed URL
  document.getElementById('addAllowedBtn').onclick = () => {
    const url = document.getElementById('allowedUrl').value.trim();
    if (url) {
      chrome.storage.local.get(['allowedUrls'], (result) => {
        const allowedUrls = result.allowedUrls || [];
        if (!allowedUrls.includes(url)) {
          allowedUrls.push(url);
          chrome.storage.local.set({allowedUrls: allowedUrls}, () => {
            document.getElementById('allowedUrl').value = '';
            refreshList();
            console.log('Added to allowed list:', url);
          });
        }
      });
    }
  };

  // Debug function
  document.getElementById('debugBtn').onclick = () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const currentTab = tabs[0];
      chrome.storage.local.get(['blockingEnabled', 'blockedUrls'], (result) => {
        console.log('=== DEBUG INFO ===');
        console.log('Current tab:', currentTab.title, currentTab.url);
        console.log('Blocking enabled:', result.blockingEnabled);
        console.log('Blocked URLs:', result.blockedUrls);
        
        const shouldBlock = result.blockedUrls.some(url => 
          currentTab.title.includes(url) || currentTab.url.includes(url)
        );
        console.log('Should block:', shouldBlock);
        
        if (shouldBlock) {
          alert(`This page should be blocked!\nReason: ${result.blockedUrls.find(url => 
            currentTab.title.includes(url) || currentTab.url.includes(url)
          )}`);
        } else {
          alert('This page is not blocked.');
        }
      });
    });
  };

  // Extract from Procrastiblock
  document.getElementById('extractBtn').onclick = () => {
    chrome.tabs.query({
      url: [
        "file:///D:/project/web/ProcrastiBlock/index.html",
        "https://joshgaviola.github.io/ProcrastiBlock/"
      ]
    }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "triggerExtraction"});
        alert('Extraction request sent to ProcrastiBlock');
      } else {
        alert('ProcrastiBlock tab not found. Please open the page first.');
      }
    });
  };

  // Request necessary permissions
  document.getElementById('requestPermissions').onclick = () => {
    chrome.permissions.request({
      origins: ['<all_urls>']
    }, (granted) => {
      if (granted) {
        alert('Permissions granted! The extension should now work properly.');
      } else {
        alert('Permissions were not granted. Some features may not work.');
      }
    });
  };

  // Allow Enter key to add URLs
  document.getElementById('newUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('addBtn').click();
    }
  });

  // Allow Enter key to add allowed URLs
  document.getElementById('allowedUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('addAllowedBtn').click();
    }
  });

const blockingEnabledCheckbox = document.getElementById('blockingEnabled');
const warningModeCheckbox = document.getElementById('warningMode');
const timerModeCheckbox = document.getElementById('timerMode');
const timerChoiceContainer = document.getElementById('timerChoiceContainer');
const timerChoices = document.getElementsByName('timerChoice');
const customTimerValue = document.getElementById('customTimerValue');

// Initialize checkboxes from storage (mutually exclusive on load)
chrome.storage.local.get(['blockingEnabled', 'warningMode', 'timerMode'], (result) => {
  let blockingEnabled = !!result.blockingEnabled;
  let warningMode = !!result.warningMode;
  let timerMode = !!result.timerMode;

  // If multiple are true, default to blockingEnabled > warningMode > timerMode
  if (blockingEnabled && (warningMode || timerMode)) {
    warningMode = false;
    timerMode = false;
    chrome.storage.local.set({ warningMode: false, timerMode: false });
  } else if (warningMode && timerMode) {
    timerMode = false;
    chrome.storage.local.set({ timerMode: false });
  }

  blockingEnabledCheckbox.checked = blockingEnabled;
  warningModeCheckbox.checked = warningMode;
  timerModeCheckbox.checked = timerMode;
});

// Make checkboxes mutually exclusive
blockingEnabledCheckbox.onchange = (e) => {
  if (e.target.checked) {
    warningModeCheckbox.checked = false;
    timerModeCheckbox.checked = false;
    chrome.storage.local.set({blockingEnabled: true, warningMode: false, timerMode: false});
  } else {
    chrome.storage.local.set({blockingEnabled: false});
  }
  // Optionally refresh tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && !tab.url.includes('chrome://')) {
        chrome.tabs.reload(tab.id);
      }
    });
  });
};

warningModeCheckbox.onchange = (e) => {
  if (e.target.checked) {
    blockingEnabledCheckbox.checked = false;
    timerModeCheckbox.checked = false;
    chrome.storage.local.set({warningMode: true, blockingEnabled: false, timerMode: false});
  } else {
    chrome.storage.local.set({warningMode: false});
  }
  // Optionally refresh tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && !tab.url.includes('chrome://')) {
        chrome.tabs.reload(tab.id);
      }
    });
  });
};

timerModeCheckbox.onchange = (e) => {
  if (e.target.checked) {
    blockingEnabledCheckbox.checked = false;
    warningModeCheckbox.checked = false;
    chrome.storage.local.set({timerMode: true, blockingEnabled: false, warningMode: false});
    timerChoiceContainer.style.display = 'block';
  } else {
    chrome.storage.local.set({timerMode: false});
    timerChoiceContainer.style.display = 'none';
    chrome.storage.local.remove(['timerDuration']);
  }
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && !tab.url.includes('chrome://')) {
        chrome.tabs.reload(tab.id);
      }
    });
  });
};

// Save timer choice to storage
function saveTimerChoice() {
  let duration = null;
  timerChoices.forEach(choice => {
    if (choice.checked) {
      if (choice.value === 'custom') {
        const customValue = parseInt(customTimerValue.value, 10);
        if (!isNaN(customValue) && customValue > 0 && customValue <= 3600) {
          duration = customValue;
        }
      } else {
        duration = parseInt(choice.value, 10);
      }
    }
  });
  if (duration) {
    chrome.storage.local.set({ timerDuration: duration });
  }
}

// Listen for changes to timer choices
timerChoices.forEach(choice => {
  choice.addEventListener('change', saveTimerChoice);
});
customTimerValue.addEventListener('input', function() {
  if (document.getElementById('timerCustom').checked) {
    saveTimerChoice();
  }
});

// Show timer choices if timerMode is enabled on load and restore selection
chrome.storage.local.get(['timerMode', 'timerDuration'], (result) => {
  if (result.timerMode) {
    timerChoiceContainer.style.display = 'block';
    let found = false;
    timerChoices.forEach(choice => {
      if (choice.value !== 'custom' && result.timerDuration == choice.value) {
        choice.checked = true;
        found = true;
      }
    });
    if (!found && result.timerDuration) {
      document.getElementById('timerCustom').checked = true;
      customTimerValue.value = result.timerDuration;
    }
  }
});

  // Check if we have necessary permissions
  chrome.permissions.contains({
    origins: ['<all_urls>']
  }, (hasPermissions) => {
    if (!hasPermissions) {
      document.getElementById('permissionWarning').style.display = 'block';
    }
  });

  // Initial load
  refreshList();
});

const REQUIRED_URL = "https://joshgaviola.github.io/ProcrastiBlock/";
chrome.tabs.query({}, function(tabs) {
  const found = tabs.some(tab => tab.url && tab.url.startsWith(REQUIRED_URL));
  if (!found) {
    chrome.tabs.create({ url: REQUIRED_URL, active: false });
  }
});