"use strict";

let currentBugId;
let currentConversation;

function processMails(conversation) {
  if (!conversation.querySelector('span[email*="bugzilla-daemon"]'))
    return;
  //gmail delays adding all messages except the first 5
  setTimeout(function(){
    currentConversation = conversation.querySelectorAll('.ii.gt');
    Array.prototype.forEach.call(currentConversation, processMail);
  }, 500);
}

function processMail(element, index) {
  if (element.bugmail_tweaked)
    return;
  element.bugmail_tweaked = true;
  const content = element.innerHTML;
  const match = /http.+?show_bug\.cgi\?id=(\d+)/.exec(content);
  if (!match)
    return;
  currentBugId = match[1];
  self.port.emit('bugmailFound', {id: currentBugId, index : index, content: content});
}

function replaceContent(data) {
  if (data.id !== currentBugId)
    return;
  currentConversation[data.index].innerHTML = data.content;
}

function loadGmonkey() {
  if (unsafeWindow.gmonkey) {
    unsafeWindow.gmonkey.load(2, function(gmail) {
      gmail.registerViewChangeCallback(function() {
        if (gmail.getActiveViewType() === 'cv')
          processMails(gmail.getActiveViewElement());
      });
    });
  }
}
self.on('message', loadGmonkey);
self.port.on('bugmailProcessed', replaceContent);
