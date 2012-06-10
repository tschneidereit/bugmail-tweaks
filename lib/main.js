"use strict";

let pageMod = require('page-mod');
let data = require('self').data;
let tweaker = require('message_tweaks');

exports.main = function(options, callback) {
  pageMod.PageMod({
    include: /.+mail\.google\.com\/mail\/.+shva=.+/,
    contentScriptWhen: 'end',
    contentScriptFile: data.url('js/bzmail.js'),
    onAttach: function(worker) {
    	worker.postMessage('ready');
      worker.port.on('bugmailFound', function(data) {
        data.content = tweaker.processBugmail(data.content);
        worker.port.emit('bugmailProcessed', data);
      });
    }
  });
}
