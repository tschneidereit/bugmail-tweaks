"use strict";

let bz;

function replacer(pattern, replacement) {
  return function(html, obj) {
    pattern = new RegExp(pattern.source, "gm");
    return html.replace(pattern, replacement);
  }
};

function bug(num, str) {
  if (!str)
    str = num;
  return '<a href="{bz}show_bug.cgi?id=' + num + '" target="_blank">' + str + '</a>';
};

function attachment(num, str) {
  if (!str)
    str = num;
  return '<a href="{bz}attachment.cgi?id=' + num + '" target="_blank">' + str + '</a>';
};



let rblocks = replacer(/Blocks: (\d+)/,
                       'Blocks: ' + bug('$1'));

let rbug = replacer(/([bB]ug:?\s*)(\d+)/,
                    bug('$2', '$1$2'));

// Rewrite bugs in the final column of a table
let rtablebug1 = replacer(/\|(\d+)[^.-]\n/,
                          '|' + bug('$1') + '\n');

let rtablebug2 = replacer(/\|(\d+)[^.-], (\d+)[^.-]\n/,
                          '|' + bug('$1') + ', ' + bug('$2') + '\n');

let rtablebug3 = replacer(/\|(\d+)[^.-], (\d+)[^.-], (\d+)[^.-]([,\n])/,
                          '|' + bug('$1') + ', ' + bug('$2') + ', ' + bug('$3') + '$4');

// Rewrite bugs in the middle column of a table
let rtablebug4 = replacer(/\|(\d+)[^.-](\s+|)/,
                          '|' + bug('$1') + '$2');

let rtablebug5 = replacer(/\|(\d+)[^.-], (\d+)[^.-](\s+|)/,
                          '|' + bug('$1') + ', ' + bug('$2') + '$3');

let rtablebug6 = replacer(/\|(\d+)[^.-], (\d+)[^.-], (\d+)[^.-]([,\s]|)/,
                          '|' + bug('$1') + ', ' + bug('$2') + ', ' + bug('$3') + '$4');

let rtableattachment = replacer(/Attachment #(\d+)/, "Attachment #" + attachment('$1'));


function monospacer(html, obj) {
  // Parse a bugzilla block and wrap pre tags around it. eg:
  //    What    |Removed                     |Added
  //    ----------------------------------------------------------------------------
  //    Summary |Add trychooser syntax for   |Add trychooser syntax for
  //            |SM builds                   |Spidermonkey builds


  // The HTML gmail generates around this can be quite changable, so be
  // robust. We match on HEADER+BARS+ROWS*. We stop when there is a newline
  // with no '&nbsp;'s (not too hard since '.' doesn't match newlines in JS).

  let header1 = /( &nbsp;){5} What( &nbsp;){2}\|Old Value( &nbsp;){9} \|New Value/;
  let header2 = /( &nbsp;){5} What( &nbsp;){2}\|Removed( &nbsp;){10} \|Added/;
  let bars = /(-*<wbr>){2}-*/;
  let row = /.*nbsp.*/;


  // A simple line parser. When we see a header we open a PRE tag, and we
  // close it again once we no longer match a row.

  let result = "";
  let started = false;
  let readd_div = false;

  let lines = html.split(/<br>\n/);
  for each (let line in lines) {

    if (line.match(header1) || line.match(header2)) {
      // heading
      started = true;
      result += '<pre>' + line + '\n';
    } else if (started) {
      if (line.match(bars) || line.match(row)) {
        // rows
        
        // Special case: sometimes gmail closes a <div> in the middle of the
        // table, which closes the pre. I don't like special-casing this, but
        // the nicer way (wrapping each line in a <pre>) doesn't really fix
        // the problem without a hack of it's own, and also leads to bad spacing.
        if (line.match(/<\/div>/)) {
          readd_div = true;
          line = line.replace(/<\/div>/, '');
        }

        result += line + '\n';

        // spacial case
      } else {
        // Finished
        if (readd_div) {
          result += '</pre></div>\n' + line;
        } else {
          result += '</pre>\n' + line;
        }
        started = false;

      }
    } else {
      // Unrelated
      result += line + '<br>\n';
    }
  }

  return result;
}

function linkComments(html, data) {
  if (!data)
    return html;

  let linkedComment = '<a href="{bz}show_bug.cgi?id=' + data.bug_num + '#c' 
                    + data.comment_num + '" target="_blank">Comment #' + data.comment_num + '</a>';

  let result = html.replace(/--- Comment #(\d+)/, '--- ' + linkedComment);
  return result;
}

function comment_parser(html) {
  // let comment_num = '--- Comment #(\\d+)';
  // let author = ' from (.+?)';
  // let username = '[(\\[](.+?)[)\\]]|()';
  // let email = ' &lt;.+?href="(.+?)".+?&gt; ';
  // let date = '(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2} \\w+) ---';
  // let anything = '[\\s\\S]*?';

  let data = {};
  data.bug_num = /show_bug.cgi\?id=(\d+)/.exec(html)[1];

  let commentMatch = /--- Comment #(\d+)/.exec(html);
  if (commentMatch)
    data.comment_num = commentMatch[1];

  return data;
}

let tweaker = {

  parse: function(html) {
    for each (let p in this.parsers) {
      let obj = p(html);
      if (obj) {
        return obj;
      }
    }
    return null;
  },

  replace: function(html, data) {
    for each (let r in this.replacers)
      html = r(html, data);
    html = html.replace('{bz}', bz);
    return html;
  },

  replacers: [rblocks, rbug, monospacer, rtablebug1, rtablebug2, rtablebug3, rtablebug4, 
              rtablebug5, rtablebug6, linkComments, rtableattachment],

  parsers: [comment_parser]
};

function processBugmail(mail) {
  let content = mail.content;
  bz = mail.bzWeb;

  let data = tweaker.parse(content);
  content = tweaker.replace(content, data);

  // if (tweaker.updateHtml)
  //   tweaker.updateHtml(msg, data);

  return content;
}

exports.tweaker = tweaker;
exports.replacer = replacer;
exports.processBugmail = processBugmail;