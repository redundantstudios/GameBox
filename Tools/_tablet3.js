'use strict';
const fs = require('fs');
const F = 'app/src/main/res/values-sw600dp/dimens.xml';
let s = fs.readFileSync(F, 'utf8');
s = s.replace(/<dimen name="content_max_width">640dp<\/dimen>/,
  '<dimen name="content_max_width">840dp</dimen>');
s = s.replace(/Tablet: hold the content to a comfortable reading column and centre[\s\S]*?it, rather than stretching every button across 1200px\. \*\//,
  'Tablet: hold the content to a comfortable column and centre it, rather\n' +
  '         * than stretching every button across the screen. 840dp rather than\n' +
  '         * 640dp so a large tablet still earns its width - at 640dp a 10"\n' +
  '         * tablet only filled three columns, which wasted the screen. -->');
fs.writeFileSync(F, s);
console.log(fs.readFileSync(F, 'utf8'));