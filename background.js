// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing menu items to prevent duplicates
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'renameTab',
      title: 'Rename Tab',
      contexts: ['page', 'selection']
    });
  });
});

// Inject content script if not already present, with retries
async function ensureContentScriptInjected(tabId, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 200; // ms

  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return true;
  } catch (error) {
    if (retryCount >= MAX_RETRIES) {
      throw new Error('Max retries reached for content script injection');
    }

    try {
      // Check if we can inject scripts in this tab
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        
        // Wait a bit to ensure the script is properly loaded
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        
        // Verify injection worked
        return ensureContentScriptInjected(tabId, retryCount + 1);
      }
    } catch (injectionError) {
      console.error('Error injecting content script:', injectionError);
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return ensureContentScriptInjected(tabId, retryCount + 1);
      }
      throw injectionError;
    }
  }
}

// Update tab title with retry logic
async function updateTabTitle(tabId, title, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 200; // ms

  try {
    await ensureContentScriptInjected(tabId);
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'updateTitle',
      title: title
    });
    
    if (!response || !response.success) {
      throw new Error('Failed to update title');
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return updateTabTitle(tabId, title, retryCount + 1);
    }
    throw error;
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'renameTab' && tab) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'showRenamePrompt'
      });
      
      if (!response || !response.success) {
        console.log('Failed to rename tab or user cancelled');
      }
    } catch (error) {
      console.error('Error showing rename prompt:', error);
    }
  }
});

// Track navigation states
const navigationStates = new Map();

// Handle tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    // Get the stored data
    const result = await chrome.storage.local.get(['customTitles', 'lockedTabs']);
    const customTitles = result.customTitles || {};
    const lockedTabs = result.lockedTabs || {};

    // If this tab has a locked custom title
    if (customTitles[tabId] && lockedTabs[tabId]) {
      // Track navigation state
      if (changeInfo.status === 'loading') {
        navigationStates.set(tabId, true);
      }

      // Handle different update scenarios
      if (changeInfo.title || changeInfo.status === 'complete') {
        const isNavigating = navigationStates.get(tabId);
        
        // Wait a bit if we're in the middle of navigation
        if (isNavigating && changeInfo.status !== 'complete') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        try {
          await updateTabTitle(tabId, customTitles[tabId]);
          
          // Clear navigation state if complete
          if (changeInfo.status === 'complete') {
            navigationStates.delete(tabId);
          }
        } catch (error) {
          console.error('Error updating tab title:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error handling tab update:', error);
  }
});

// Handle tab closing attempts
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    const result = await chrome.storage.local.get(['customTitles', 'lockedTabs', 'importantTabs']);
    const customTitles = result.customTitles || {};
    const lockedTabs = result.lockedTabs || {};
    const importantTabs = result.importantTabs || {};
    
    // Clean up storage
    delete customTitles[tabId];
    delete lockedTabs[tabId];
    delete importantTabs[tabId];
    navigationStates.delete(tabId);
    
    await chrome.storage.local.set({ customTitles, lockedTabs, importantTabs });
  } catch (error) {
    console.error('Error cleaning up storage:', error);
  }
});

// Inject the close prevention script when a tab is marked as important
async function injectClosePreventionScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Remove any existing handler first
        window.onbeforeunload = null;
        
        // Add the new handler
        window.onbeforeunload = (e) => {
          e.preventDefault();
          return true; // This will trigger the confirmation dialog
        };
      }
    });
  } catch (error) {
    console.error('Error injecting close prevention script:', error);
  }
}

// Remove the close prevention script when a tab is unmarked as important
async function removeClosePreventionScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.onbeforeunload = null;
      }
    });
  } catch (error) {
    console.error('Error removing close prevention script:', error);
  }
}

// Listen for changes to important tabs
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local' && changes.importantTabs) {
    const oldImportant = changes.importantTabs.oldValue || {};
    const newImportant = changes.importantTabs.newValue || {};
    
    // Find tabs that were newly marked or unmarked as important
    for (const tabId of new Set([...Object.keys(oldImportant), ...Object.keys(newImportant)])) {
      const wasImportant = oldImportant[tabId];
      const isImportant = newImportant[tabId];
      
      if (!wasImportant && isImportant) {
        // Tab was newly marked as important
        await injectClosePreventionScript(parseInt(tabId));
      } else if (wasImportant && !isImportant) {
        // Tab was unmarked as important
        await removeClosePreventionScript(parseInt(tabId));
      }
    }
  }
});

// Reinject close prevention script after navigation for important tabs
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    try {
      const { importantTabs } = await chrome.storage.local.get(['importantTabs']);
      if (importantTabs && importantTabs[tabId]) {
        await injectClosePreventionScript(tabId);
      }
    } catch (error) {
      console.error('Error checking important tab status:', error);
    }
  }
}); 