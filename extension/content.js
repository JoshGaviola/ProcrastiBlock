// Listen for messages from popup/background and inject titles into dashboard
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "injectTitles") {
    // Prefer provided tabData or tabTitles; fallback to querying background.
    if (Array.isArray(request.tabData)) {
      injectTabList(request.tabData);
      sendResponse({ status: "success" });
      return true;
    }
    if (Array.isArray(request.tabTitles)) {
      injectTabList(request.tabTitles.map(t => ({ title: t, url: '#' })));
      sendResponse({ status: "success" });
      return true;
    }
    chrome.runtime.sendMessage({ action: "getTabInfo" }, function(response) {
      if (response && response.tabs) {
        injectTabList(response.tabs);
        sendResponse({ status: "success" });
      } else {
        sendResponse({ status: "error" });
      }
    });
    return true;
  }
  return false;
});

function injectTabList(tabs) {
  const tabsDiv = document.getElementById('tabs');
  if (!tabsDiv) return;

  const oldList = tabsDiv.querySelector('ul');
  if (oldList) oldList.remove();

  const list = document.createElement('ul');
  list.style.paddingLeft = '20px';
  list.style.marginBottom = '10px';

  tabs.forEach(tab => {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.textContent = tab.title;
    link.href = tab.url || '#';
    link.target = "_blank";
    link.style.cursor = "pointer";
    link.style.textDecoration = "underline";
    link.style.color = "#000000ff";
    link.addEventListener('click', function(e) {
      if (!tab.url || tab.url === '#') return;
      e.preventDefault();
      window.open(tab.url, '_blank');
    });
    listItem.appendChild(link);
    listItem.style.marginBottom = '5px';
    listItem.style.wordWrap = 'break-word';
    list.appendChild(listItem);
  });

  tabsDiv.appendChild(list);
}

// Removed unused Ctrl+Shift+T keyboard shortcut (no background handler).