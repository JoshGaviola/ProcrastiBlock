function updateStatusIndicator() {
  chrome.storage.local.get(['blockingEnabled', 'warningMode', 'timerMode'], (result) => {
    const active = !!result.blockingEnabled || !!result.warningMode || !!result.timerMode;
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-indicator span');
    if (statusDot && statusText) {
      if (active) {
        statusDot.classList.remove('status-off');
        statusText.textContent = 'Protection Active';
      } else {
        statusDot.classList.add('status-off');
        statusText.textContent = 'Protection Disabled';
      }
    }
  });
}

// Initial update
updateStatusIndicator();

// Listen for changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.blockingEnabled || changes.warningMode || changes.timerMode)) {
    updateStatusIndicator();
  }
});