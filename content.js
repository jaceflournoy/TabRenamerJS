// Listen for messages from popup and background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle ping to check if content script is loaded
  if (request.action === 'ping') {
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'updateTitle') {
    document.title = request.title;
    sendResponse({ success: true });
  } else if (request.action === 'showRenamePrompt') {
    const newTitle = prompt('Enter new tab title:', document.title);
    if (newTitle) {
      // Save the custom title
      chrome.storage.local.get(['customTitles', 'lockedTabs'], (result) => {
        const customTitles = result.customTitles || {};
        const lockedTabs = result.lockedTabs || {};
        const tabId = sender.tab?.id || chrome.runtime.id;

        customTitles[tabId] = newTitle;
        lockedTabs[tabId] = true; // Lock the title by default when using context menu

        chrome.storage.local.set({ 
          customTitles, 
          lockedTabs 
        }, () => {
          document.title = newTitle;
          sendResponse({ success: true });
        });
      });
    } else {
      sendResponse({ success: false });
    }
  }
  return true; // Keep the message channel open for asynchronous response
}); 