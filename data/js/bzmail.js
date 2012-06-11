"use strict";

let currentBugId;
let processedMailIds = {};

function processMails(conversation, delayProcessing) {
  if (!conversation.querySelector('span[email*="bugzilla-daemon"]'))
    return;
  //gmail delays adding all messages except the first 5, so we have to delay processing
  if (delayProcessing)
    setTimeout(delayedMailsProcessing, 500, conversation);
  else
    delayedMailsProcessing(conversation);
}

function delayedMailsProcessing(conversation) {
  let mails = conversation.querySelectorAll('.ii.gt');
  Array.prototype.forEach.call(mails, processMail);
}

function processMail(element) {
  if (!element.id || processedMailIds[element.id])
    return;
  processedMailIds[element.id] = element;
  const content = element.innerHTML;
  const match = /(http.+?)show_bug\.cgi\?id=(\d+)/.exec(content);
  if (!match)
    return;
  currentBugId = match[2];
  self.port.emit('bugmailFound', 
    {bzWeb : match[1], bugId: currentBugId, id : element.id, content: content});
}

function replaceContent(data) {
  if (data.bugId !== currentBugId)
    return;
  //As we're processing the email's content on a textual basis, there's really no way to set the 
  //new content without using innerHTML.
  processedMailIds[data.id].innerHTML = data.content;
  processedMailIds[data.id] = true;
}

function loadGmonkey() {
  if (unsafeWindow.gmonkey) {
    unsafeWindow.gmonkey.load(2, function(gmail) {
      //Workaround for some gmail instances not supporting all API functions
      gmail.registerViewChangeCallback(function() {
        if (gmail.getActiveViewType() === 'cv') {
          processedMailIds = {};
          processMails(gmail.getActiveViewElement(), !gmail.registerMessageViewChangeCallback);
        }
        else
          processedMailIds = null;
      });
      if (!gmail.registerMessageViewChangeCallback)
        return;
      gmail.registerMessageViewChangeCallback(function(message) {
        if (!message || !message.getContentElement() || !message.getContentElement().parentElement 
          || message.getFromAddress().indexOf('bugzilla-daemon') < 0)
        {
          return;
        }
        processMail(message.getContentElement().parentElement);
      });
    });
  }
}
self.on('message', loadGmonkey);
self.port.on('bugmailProcessed', replaceContent);
