chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tab.url.includes('youtube.com')) {
    chrome.tabs.sendMessage(tab.id, {}, response => {
      var lastError = chrome.runtime.lastError;
      if (lastError) {
        return;
      }
    });
  }
});