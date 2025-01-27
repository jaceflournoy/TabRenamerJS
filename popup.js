document.addEventListener('DOMContentLoaded', async () => {
  const newTitleInput = document.getElementById('newTitle');
  const renameButton = document.getElementById('renameButton');
  const lockTitleCheckbox = document.getElementById('lockTitle');
  const markImportantCheckbox = document.getElementById('markImportant');
  const renamedTabsList = document.getElementById('renamedTabsList');

  let currentTabId = null;

  // Get all tabs and current tab info
  const tabs = await chrome.tabs.query({});
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (currentTab) {
    currentTabId = currentTab.id;
    newTitleInput.value = currentTab.title;
    
    // Check if title is locked and if tab is important
    const { lockedTabs, importantTabs } = await chrome.storage.local.get(['lockedTabs', 'importantTabs']);
    lockTitleCheckbox.checked = !!(lockedTabs && lockedTabs[currentTab.id]);
    markImportantCheckbox.checked = !!(importantTabs && importantTabs[currentTab.id]);
  }

  // Function to update the renamed tabs list
  async function updateRenamedTabsList() {
    const { customTitles, lockedTabs, importantTabs } = await chrome.storage.local.get(['customTitles', 'lockedTabs', 'importantTabs']);
    renamedTabsList.innerHTML = '';

    // Create elements for each renamed tab
    for (const tab of tabs) {
      if (customTitles && customTitles[tab.id]) {
        const tabItem = document.createElement('div');
        tabItem.className = 'tab-item';
        if (importantTabs && importantTabs[tab.id]) {
          tabItem.classList.add('important');
        }
        tabItem.dataset.tabId = tab.id;

        // Tab info section
        const tabInfo = document.createElement('div');
        tabInfo.className = 'tab-info';
        
        const tabTitle = document.createElement('div');
        tabTitle.className = 'tab-title';
        tabTitle.textContent = customTitles[tab.id];
        
        const tabUrl = document.createElement('div');
        tabUrl.className = 'tab-url';
        tabUrl.textContent = tab.url;

        // Add important indicator if needed
        if (importantTabs && importantTabs[tab.id]) {
          const importantIndicator = document.createElement('div');
          importantIndicator.className = 'important-indicator';
          importantIndicator.innerHTML = '&#9733;';
          tabInfo.appendChild(importantIndicator);
        }

        tabInfo.appendChild(tabTitle);
        tabInfo.appendChild(tabUrl);

        // Edit form
        const editForm = document.createElement('div');
        editForm.className = 'edit-form';
        
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.value = customTitles[tab.id];
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.className = 'edit';

        editForm.appendChild(editInput);
        editForm.appendChild(saveButton);

        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'tab-actions';
        
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'edit';
        
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove';

        actions.appendChild(editButton);
        actions.appendChild(removeButton);

        tabItem.appendChild(tabInfo);
        tabItem.appendChild(editForm);
        tabItem.appendChild(actions);
        renamedTabsList.appendChild(tabItem);

        // Event listeners for actions
        editButton.addEventListener('click', () => {
          tabItem.classList.add('editing');
          editInput.focus();
        });

        saveButton.addEventListener('click', async () => {
          const newTitle = editInput.value.trim();
          if (newTitle) {
            customTitles[tab.id] = newTitle;
            await chrome.storage.local.set({ customTitles });
            await chrome.tabs.sendMessage(tab.id, {
              action: 'updateTitle',
              title: newTitle
            });
            updateRenamedTabsList();
          }
        });

        removeButton.addEventListener('click', async () => {
          delete customTitles[tab.id];
          if (lockedTabs) {
            delete lockedTabs[tab.id];
          }
          if (importantTabs) {
            delete importantTabs[tab.id];
          }
          await chrome.storage.local.set({ customTitles, lockedTabs, importantTabs });
          // Restore original title if tab still exists
          try {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'updateTitle',
              title: tab.title
            });
          } catch (error) {
            console.log('Tab may have been closed');
          }
          updateRenamedTabsList();
        });
      }
    }
  }

  // Initial list update
  await updateRenamedTabsList();

  // Handle rename button click
  renameButton.addEventListener('click', async () => {
    const newTitle = newTitleInput.value.trim();
    if (!newTitle || !currentTabId) return;

    try {
      const result = await chrome.storage.local.get(['customTitles', 'lockedTabs', 'importantTabs']);
      const customTitles = result.customTitles || {};
      const lockedTabs = result.lockedTabs || {};
      const importantTabs = result.importantTabs || {};

      customTitles[currentTabId] = newTitle;
      if (lockTitleCheckbox.checked) {
        lockedTabs[currentTabId] = true;
      } else {
        delete lockedTabs[currentTabId];
      }

      if (markImportantCheckbox.checked) {
        importantTabs[currentTabId] = true;
      } else {
        delete importantTabs[currentTabId];
      }

      await chrome.storage.local.set({ customTitles, lockedTabs, importantTabs });
      
      await chrome.tabs.sendMessage(currentTabId, {
        action: 'updateTitle',
        title: newTitle
      });

      await updateRenamedTabsList();
    } catch (error) {
      console.error('Error renaming tab:', error);
    }
  });

  // Handle lock checkbox change
  lockTitleCheckbox.addEventListener('change', async () => {
    if (!currentTabId) return;
    
    try {
      const result = await chrome.storage.local.get(['lockedTabs']);
      const lockedTabs = result.lockedTabs || {};
      
      if (lockTitleCheckbox.checked) {
        lockedTabs[currentTabId] = true;
      } else {
        delete lockedTabs[currentTabId];
      }

      await chrome.storage.local.set({ lockedTabs });
    } catch (error) {
      console.error('Error updating lock state:', error);
    }
  });

  // Handle important checkbox change
  markImportantCheckbox.addEventListener('change', async () => {
    if (!currentTabId) return;
    
    try {
      const result = await chrome.storage.local.get(['importantTabs']);
      const importantTabs = result.importantTabs || {};
      
      if (markImportantCheckbox.checked) {
        importantTabs[currentTabId] = true;
      } else {
        delete importantTabs[currentTabId];
      }

      await chrome.storage.local.set({ importantTabs });
    } catch (error) {
      console.error('Error updating important state:', error);
    }
  });
}); 