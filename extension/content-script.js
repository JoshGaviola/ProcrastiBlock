// Check if blocking is enabled before wiping the page
function checkAndBlock() {
  chrome.storage.local.get(['blockingEnabled', 'blockedUrls', 'allowedUrls', 'warningMode'], (result) => {
    const warningMode = result.warningMode;
    if (result.blockingEnabled === false && !warningMode) {
      return;
    }

    const blockedTitles = result.blockedUrls || [];
    const allowedTitles = result.allowedUrls || [];
    const currentUrl = window.location.href;
    const pageTitle = document.title || '';

    // Don't block the blocked page itself or extension pages
    if (currentUrl.includes('blocked.html') || currentUrl.includes('chrome-extension://') || currentUrl === 'file:///D:/project/web/ProcrastiBlock/index.html') {
      return;
    }

    // Check if current page matches any allowed item (exact match only)
    const isAllowed = allowedTitles.some(allowed =>
      pageTitle === allowed || currentUrl === allowed
    );
    if (isAllowed) {
      return;
    }

    // Block only if current page title or URL exactly matches a blocklist item
    const shouldBlock = blockedTitles.some(blockedTitle =>
      pageTitle === blockedTitle || currentUrl === blockedTitle
    );

    if (shouldBlock) {
      if (warningMode) {
        injectIrrelevantWarningPopup(currentUrl);
        return;
      }
      blockPage(pageTitle);
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

function injectIrrelevantWarningPopup(blockedUrl) {
  if (document.getElementById('pb-irrelevant-warning-popup')) return;
  const popup = document.createElement('div');
  popup.id = 'pb-irrelevant-warning-popup';
  popup.style.cssText = `
    position: fixed; top: 24px; right: 24px; z-index: 2147483647;
    background: #fff3cd; color: #664d03; border: 1px solid #ffe69c;
    padding: 18px 22px; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    font-size: 16px; max-width: 350px; min-width: 220px;
    display: flex; flex-direction: column; align-items: flex-start;
    animation: pb-slide-in 0.4s cubic-bezier(.4,2,.3,1);
  `;
  popup.innerHTML = `
    <div style="font-weight:600; margin-bottom:8px;">⚠️ Not Related to Your Task</div>
    <div style="margin-bottom:12px;">This tab (<span style="font-weight:bold;">${document.title}</span>) is marked as irrelevant to your current focus.</div>
    <button id="pb-irrelevant-warning-dismiss" style="
      align-self: flex-end;
      background:#fff; border:1px solid #d3b800; color:#664d03; padding:6px 14px; border-radius:6px; cursor:pointer;
      font-size: 14px;
    ">Dismiss</button>
    <style>
      @keyframes pb-slide-in {
        from { opacity: 0; transform: translateY(-30px) scale(0.95);}
        to { opacity: 1; transform: translateY(0) scale(1);}
      }
    </style>
  `;
  document.body.appendChild(popup);
  document.getElementById('pb-irrelevant-warning-dismiss')?.addEventListener('click', () => {
    popup.remove();
  });
}

// Listen for background-triggered warnings
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showIrrelevantWarning' && request.url) {
    injectIrrelevantWarningPopup(request.url);
  }
});

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