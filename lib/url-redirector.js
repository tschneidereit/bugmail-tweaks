"use strict";

let prefs = require("simple-prefs");
let privateBrowsing = require("private-browsing");
let storage = require("simple-storage").storage;
let tabs = require("tabs");
let windowUtils = require("window-utils");

if (!storage.bugmailUrls)
    storage.bugmailUrls = {};

function rememberBugmailUrl(data) {
  if (privateBrowsing.isActive)
    return;
  storage.bugmailUrls[tabs.activeTab.url] = data.bzWeb + 'show_bug.cgi?id=' + data.bugId;
}

if (prefs.prefs.redirectBugmailUrls)
  activateUrlInterceptors();

prefs.on('redirectBugmailUrls', function() {
  if (prefs.prefs.redirectBugmailUrls)
    activateUrlInterceptors();
  else
    deactivateUrlInterceptors();
});

let windowTracker;

function activateUrlInterceptors() {
  windowTracker = new windowUtils.WindowTracker(
    {onTrack : installUrlInterceptor, onUntrack : removeUrlInterceptor});
}
function deactivateUrlInterceptors() {
  windowTracker.unload();
}

function installUrlInterceptor(window) {
  let urlBar = window.gURLBar;
  urlBar.ownHandleCommand = urlBar.handleCommand;
  urlBar.handleCommand = function(event) {
    if (storage.bugmailUrls[tabs.activeTab.url] 
      && !/https?:\/\/mail\.google\.com/.test(tabs.activeTab.url))
    {
      tabs.activeTab.url = storage.bugmailUrls[tabs.activeTab.url];
    }
    else {
      urlBar.ownHandleCommand.call(urlBar, event);
    }
  }
  urlBar.ownOnBeforeValueSet = urlBar.onBeforeValueSet;
  urlBar.onBeforeValueSet = function(value) {
    if (storage.bugmailUrls[value] && !/https?:\/\/mail\.google\.com/.test(tabs.activeTab.url))
      return storage.bugmailUrls[value];
    return urlBar.ownOnBeforeValueSet.call(urlBar, value);
  }
}

function removeUrlInterceptor(window) {
  let urlBar = window.gURLBar;
  urlBar.handleCommand = urlBar.ownHandleCommand;
  urlBar.onBeforeValueSet = urlBar.ownOnBeforeValueSet;
}

exports.rememberBugmailUrl = rememberBugmailUrl;