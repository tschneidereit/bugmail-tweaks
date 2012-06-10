const data = require("self").data;
const bzmail = require('message_tweaks');

exports.test_bzmail = function(test) {

  // Extract the tests
  let json = data.load("test-msgs.json");
  let tests = JSON.parse(json);

  let tw = bzmail.tweaker;

  // Each tag names a function which should trigger a change in the contents
  for each(let t in tests) {
    console.log(t.name);

    // Check all of our messages are matched
    // test.assert(tw.matches(t.html), "tweaker matches");

    let data = tw.parse(t.html);

    // Check that we haven't mistagged
    if (data.comment_num) {
      for each(tag in ["comment"]) {
        test.assert(t.tags.indexOf(tag) > -1, "not mistagged");
      }
    }

    // Check parsing
    if ("comment" in t.tags) {
      test.assert(data, "data successfully parsed");
    }

    // Check replacers do something
    for each(let tag in t.tags) {
      if (tag == "comment") {
        let replacer = tw.replacers['replace_' + tag];
        let new_ = bzmail.replacer(t.html, data);
        test.assertNotEqual(new_, t.html, "replacer applied");
      }
    }
  }
}
