// Background Service Worker (Manifest V3)
// Minimal bootstrap; real logic will be added in tasks 2.x
chrome.runtime.onInstalled.addListener(() => {
  console.log('LinkTrove installed');
});

chrome.runtime.onStartup?.addListener?.(() => {
  console.log('LinkTrove startup');
});

