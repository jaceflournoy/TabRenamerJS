# Tab Renamer Extension

A browser extension that allows you to rename tabs and keep the custom names persistent across page loads and navigation.

## Features

- **Custom Tab Names**: Rename any tab with a custom title
- **Persistent Names**: Custom names are maintained when navigating or reloading the page
- **Lock Feature**: Lock tab names to prevent automatic updates
- **Important Tabs**: Mark tabs as important to get a confirmation dialog before closing
- **Multiple Access Methods**:
  - Use the extension popup interface
  - Right-click context menu option
- **Tab Management**:
  - View all renamed tabs in one place
  - Edit existing custom names
  - Remove custom names
  - See which tabs are marked as important

## Installation

1. Clone or download this repository to your local machine
2. Open your browser and navigate to the extensions page:
   - For Chrome: Go to `chrome://extensions/`
   - For Edge: Go to `edge://extensions/`
3. Enable "Developer mode" using the toggle in the top right
4. Click "Load unpacked" button
5. Select the directory containing the extension files

## Usage

### Using the Popup Interface

1. Click the extension icon in your browser toolbar
2. Enter a new title for the current tab
3. Optional: Check "Lock title" to prevent automatic updates
4. Optional: Check "Mark as important" to get a confirmation when closing
5. Click "Rename Tab" to apply the changes

### Using the Context Menu

1. Right-click anywhere on a webpage
2. Select "Rename Tab" from the context menu
3. Enter the new title in the prompt
4. The tab will be automatically renamed and locked

### Managing Renamed Tabs

1. Open the extension popup
2. View all renamed tabs in the list
3. For each renamed tab you can:
   - See its current custom name and URL
   - Edit the custom name using the "Edit" button
   - Remove the custom name using the "Remove" button
   - Identify important tabs by the star icon (★)

## Files Structure

- `manifest.json`: Extension configuration
- `popup.html`: Extension popup interface
- `popup.js`: Popup functionality
- `background.js`: Background service worker
- `content.js`: Content script for tab manipulation
- `styles.css`: Extension styling

## Permissions Used

- `tabs`: For accessing and modifying tab information
- `storage`: For storing custom names and settings
- `contextMenus`: For the right-click menu option
- `scripting`: For injecting scripts into tabs
- `host_permissions`: For accessing tab content

## Browser Compatibility

- Google Chrome
- Microsoft Edge
- Other Chromium-based browsers 