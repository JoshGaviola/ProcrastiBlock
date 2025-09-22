document.addEventListener('DOMContentLoaded', function() {
  const tabList = document.getElementById('tabList');
  const refreshBtn = document.getElementById('refreshBtn');
  const injectBtn = document.getElementById('injectBtn');

  // Load tab titles when popup opens
  loadTabTitles();

  refreshBtn.addEventListener('click', loadTabTitles);
  
  injectBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "injectTitles",
          tabTitles: getTabTitlesArray()
        }, function(response) {
          if (response && response.status === "success") {
            alert("Tab titles injected successfully!");
          } else {
            alert("Failed to inject titles. Make sure you're on a supported page.");
          }
        });
      }
    });
  });

  function loadTabTitles() {
    chrome.tabs.query({}, function(tabs) {
      tabList.innerHTML = '';
      
      tabs.forEach(tab => {
        if (tab.title && tab.url) {
          const tabItem = document.createElement('div');
          tabItem.className = 'tab-item';
          tabItem.textContent = tab.title;
          tabList.appendChild(tabItem);
        }
      });
    });
  }

  function getTabTitlesArray() {
    const tabItems = tabList.querySelectorAll('.tab-item');
    const titles = [];
    tabItems.forEach(item => {
      titles.push(item.textContent);
    });
    return titles;
  }

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

  // Extract from FocusGuard
  document.getElementById('extractBtn').onclick = () => {
      chrome.tabs.query({url: "file:///D:/project/web/ProcrastiBlock/dashboard/index.html"}, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "triggerExtraction"});
        alert('Extraction request sent to FocusGuard');
      } else {
        alert('FocusGuard tab not found. Please open the FocusGuard page first.');
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