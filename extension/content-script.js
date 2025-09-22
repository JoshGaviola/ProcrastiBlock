// Check if blocking is enabled before wiping the page
function checkAndBlock() {
  chrome.storage.local.get(['blockingEnabled', 'blockedUrls', 'allowedUrls'], (result) => {
    console.log('Content script loaded. Blocking enabled:', result.blockingEnabled);

    if (result.blockingEnabled === false) {
      console.log('Blocking is disabled, skipping');
      return;
    }

    const blockedTitles = result.blockedUrls || [];
    const allowedTitles = result.allowedUrls || [];
    const currentUrl = window.location.href;
    const pageTitle = document.title || '';

    console.log('Current page:', pageTitle, currentUrl);

    // Don't block the blocked page itself or extension pages
    if (currentUrl.includes('blocked.html') || currentUrl.includes('chrome-extension://')) {
      console.log('Skipping blocked/extension page');
      return;
    }

    // Check if current page matches any allowed item
    const isAllowed = allowedTitles.some(allowed =>
      pageTitle.includes(allowed) || currentUrl.includes(allowed)
    );
    if (isAllowed) {
      console.log('Page is allowed, skipping block');
      return;
    }

    // Check if current page title matches any in our blocklist
    const shouldBlock = blockedTitles.some(blockedTitle => {
      const isBlocked = pageTitle.includes(blockedTitle) || currentUrl.includes(blockedTitle);
      if (isBlocked) {
        console.log('Blocking match found:', blockedTitle);
      }
      return isBlocked;
    });

    if (shouldBlock) {
      console.log('Blocking page:', pageTitle);
      blockPage(pageTitle);
    } else {
      console.log('No blocking required for this page');
    }
  });
}

function blockPage(pageTitle) {
  // Create a clean blocking page, but keep the original title
  const blockHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${pageTitle}</title> 
      <style>
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0;
          color: white;
        }
        .block-container {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 {
          font-size: 2.5em;
          margin-bottom: 20px;
        }
        p {
          font-size: 1.2em;
          margin-bottom: 30px;
          opacity: 0.9;
        }
        .button {
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          border-radius: 25px;
          cursor: pointer;
          font-size: 1em;
          transition: all 0.3s ease;
          margin: 0 10px;
        }
        .button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="block-container">
        <h1>🚫 Site Blocked</h1>
        <p>"${pageTitle}" has been blocked by FocusGuard</p>
        <div>
          <button class="button" onclick="window.history.back()">Go Back</button>
          <button class="button" onclick="window.location.href = 'https://www.google.com'">Go to Google</button>
        </div>
      </div>
    </body>
    </html>
  `;
  
  document.documentElement.innerHTML = blockHTML;
  window.stop();
}

// Listen for storage changes to update blocking in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes.blockingEnabled || changes.blockedUrls)) {
    console.log('Storage changed, re-checking blocking');
    checkAndBlock();
  }
});

// Initial check when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndBlock);
} else {
  checkAndBlock();
}