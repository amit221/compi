#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/ansi-regex/index.js
var require_ansi_regex = __commonJS({
  "node_modules/ansi-regex/index.js"(exports2, module2) {
    "use strict";
    module2.exports = ({ onlyFirst = false } = {}) => {
      const pattern = [
        "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
        "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
      ].join("|");
      return new RegExp(pattern, onlyFirst ? void 0 : "g");
    };
  }
});

// node_modules/strip-ansi/index.js
var require_strip_ansi = __commonJS({
  "node_modules/strip-ansi/index.js"(exports2, module2) {
    "use strict";
    var ansiRegex = require_ansi_regex();
    module2.exports = (string) => typeof string === "string" ? string.replace(ansiRegex(), "") : string;
  }
});

// node_modules/is-fullwidth-code-point/index.js
var require_is_fullwidth_code_point = __commonJS({
  "node_modules/is-fullwidth-code-point/index.js"(exports2, module2) {
    "use strict";
    var isFullwidthCodePoint = (codePoint) => {
      if (Number.isNaN(codePoint)) {
        return false;
      }
      if (codePoint >= 4352 && (codePoint <= 4447 || // Hangul Jamo
      codePoint === 9001 || // LEFT-POINTING ANGLE BRACKET
      codePoint === 9002 || // RIGHT-POINTING ANGLE BRACKET
      // CJK Radicals Supplement .. Enclosed CJK Letters and Months
      11904 <= codePoint && codePoint <= 12871 && codePoint !== 12351 || // Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
      12880 <= codePoint && codePoint <= 19903 || // CJK Unified Ideographs .. Yi Radicals
      19968 <= codePoint && codePoint <= 42182 || // Hangul Jamo Extended-A
      43360 <= codePoint && codePoint <= 43388 || // Hangul Syllables
      44032 <= codePoint && codePoint <= 55203 || // CJK Compatibility Ideographs
      63744 <= codePoint && codePoint <= 64255 || // Vertical Forms
      65040 <= codePoint && codePoint <= 65049 || // CJK Compatibility Forms .. Small Form Variants
      65072 <= codePoint && codePoint <= 65131 || // Halfwidth and Fullwidth Forms
      65281 <= codePoint && codePoint <= 65376 || 65504 <= codePoint && codePoint <= 65510 || // Kana Supplement
      110592 <= codePoint && codePoint <= 110593 || // Enclosed Ideographic Supplement
      127488 <= codePoint && codePoint <= 127569 || // CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
      131072 <= codePoint && codePoint <= 262141)) {
        return true;
      }
      return false;
    };
    module2.exports = isFullwidthCodePoint;
    module2.exports.default = isFullwidthCodePoint;
  }
});

// node_modules/emoji-regex/index.js
var require_emoji_regex = __commonJS({
  "node_modules/emoji-regex/index.js"(exports2, module2) {
    "use strict";
    module2.exports = function() {
      return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F|\uD83D\uDC68(?:\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68\uD83C\uDFFB|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|[\u2695\u2696\u2708]\uFE0F|\uD83D[\uDC66\uDC67]|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708])\uFE0F|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C[\uDFFB-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)\uD83C\uDFFB|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB\uDFFC])|\uD83D\uDC69(?:\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB-\uDFFD])|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|(?:(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)\uFE0F|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\u200D[\u2640\u2642])|\uD83C\uDFF4\u200D\u2620)\uFE0F|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF4\uD83C\uDDF2|\uD83C\uDDF6\uD83C\uDDE6|[#\*0-9]\uFE0F\u20E3|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270A-\u270D]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC70\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDCAA\uDD74\uDD7A\uDD90\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD36\uDDB5\uDDB6\uDDBB\uDDD2-\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5\uDEEB\uDEEC\uDEF4-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
    };
  }
});

// node_modules/string-width/index.js
var require_string_width = __commonJS({
  "node_modules/string-width/index.js"(exports2, module2) {
    "use strict";
    var stripAnsi = require_strip_ansi();
    var isFullwidthCodePoint = require_is_fullwidth_code_point();
    var emojiRegex = require_emoji_regex();
    var stringWidth2 = (string) => {
      if (typeof string !== "string" || string.length === 0) {
        return 0;
      }
      string = stripAnsi(string);
      if (string.length === 0) {
        return 0;
      }
      string = string.replace(emojiRegex(), "  ");
      let width = 0;
      for (let i = 0; i < string.length; i++) {
        const code = string.codePointAt(i);
        if (code <= 31 || code >= 127 && code <= 159) {
          continue;
        }
        if (code >= 768 && code <= 879) {
          continue;
        }
        if (code > 65535) {
          i++;
        }
        width += isFullwidthCodePoint(code) ? 2 : 1;
      }
      return width;
    };
    module2.exports = stringWidth2;
    module2.exports.default = stringWidth2;
  }
});

// src/cli.ts
var path3 = __toESM(require("path"));
var os2 = __toESM(require("os"));

// src/state/state-manager.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));

// config/balance.json
var balance_default = {
  colors: {
    grey: 0.3,
    white: 0.25,
    cyan: 0.2,
    magenta: 0.13,
    yellow: 0.08,
    red: 0.04
  },
  batch: {
    spawnIntervalMs: 18e5,
    batchLingerMs: 18e5,
    sharedAttempts: 3,
    timeOfDay: {
      morning: [6, 12],
      afternoon: [12, 17],
      evening: [17, 21],
      night: [21, 6]
    }
  },
  catching: {
    baseCatchRate: 0.9,
    minCatchRate: 0.15,
    maxCatchRate: 0.9,
    failPenaltyPerMiss: 0.1,
    maxTraitSpawnRate: 0.12,
    difficultyScale: 0.5,
    xpBase: 20,
    xpRarityMultiplier: 5
  },
  energy: {
    gainIntervalMs: 18e5,
    maxEnergy: 30,
    startingEnergy: 5,
    sessionBonus: 3,
    costPerRarity: {
      common: 1,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4,
      mythic: 5
    },
    baseMergeCost: 3,
    maxMergeCost: 8,
    rareThreashold: 0.05
  },
  breed: {
    inheritanceBase: 0.5,
    inheritanceRarityScale: 0.8,
    inheritanceMin: 0.45,
    inheritanceMax: 0.58,
    referenceSpawnRate: 0.12
  },
  merge: {
    slotWeightBase: 1,
    slotWeightPerTier: 2.5
  },
  progression: {
    xpPerLevel: 100,
    sessionGapMs: 9e5,
    tickPruneCount: 500
  },
  rewards: {
    milestones: [
      {
        id: "first_catch",
        description: "First catch!",
        condition: { type: "totalCatches", threshold: 1 },
        reward: [{ energy: 3 }],
        oneTime: true
      },
      {
        id: "catch_10",
        description: "10 catches!",
        condition: { type: "totalCatches", threshold: 10 },
        reward: [{ energy: 5 }],
        oneTime: true
      },
      {
        id: "catch_50",
        description: "50 catches!",
        condition: { type: "totalCatches", threshold: 50 },
        reward: [{ energy: 10 }],
        oneTime: true
      },
      {
        id: "streak_3",
        description: "3-day streak!",
        condition: { type: "currentStreak", threshold: 3 },
        reward: [{ energy: 3 }],
        oneTime: true
      },
      {
        id: "streak_7",
        description: "7-day streak!",
        condition: { type: "currentStreak", threshold: 7 },
        reward: [{ energy: 7 }],
        oneTime: true
      },
      {
        id: "streak_30",
        description: "30-day streak!",
        condition: { type: "currentStreak", threshold: 30 },
        reward: [{ energy: 15 }],
        oneTime: true
      }
    ]
  },
  messages: {
    scan: {
      empty: "No signals detected \u2014 nothing nearby right now.",
      header: "NEARBY SIGNALS \u2014 {count} detected",
      energy: "Energy: {energy}/{maxEnergy}",
      footer: "Use /catch [number] to attempt capture"
    },
    catch: {
      successHeader: "\u2726 CAUGHT! \u2726",
      captured: "{name} joined your collection!",
      xpGained: "+{xp} XP",
      energySpent: "-{energy} Energy",
      fledHeader: "\u2726 FLED \u2726",
      fledMessage: "{name} fled into the void!",
      escapedHeader: "\u2726 ESCAPED \u2726",
      escapedMessage: "{name} slipped away!",
      escapedHint: "{attempts} attempts remaining"
    },
    collection: {
      empty: "Your collection is empty. Use /scan to find creatures nearby.",
      header: "Your creatures ({count})"
    },
    merge: {
      previewHeader: "Merge Preview",
      confirmHint: "/merge confirm to proceed",
      successHeader: "\u2726 MERGE SUCCESS \u2726",
      upgraded: "{name} \u2014 {slot} upgraded!",
      consumed: "{name} was consumed."
    },
    status: {
      header: "Player Status",
      level: "Level {level}",
      xp: "XP: {bar} {xp}/{nextXp}",
      catches: "Catches: {count}",
      merges: "Merges: {count}",
      collection: "Collection: {count} creatures",
      streak: "Streak: {streak} days (best: {best})",
      nearby: "Nearby: {count} creatures",
      ticks: "Ticks: {count}",
      energy: "Energy: {energy}/{maxEnergy}"
    },
    notifications: {
      despawn: "Creatures slipped away...",
      rareSpawn: "Rare signal detected!",
      normalSpawn: "Something flickering nearby...",
      milestone: "Milestone reached! +{energy} energy"
    }
  },
  upgrade: {
    costs: [3, 5, 9, 15, 24, 38, 55],
    maxRank: 7,
    sessionCap: 2
  },
  quest: {
    maxTeamSize: 3,
    lockDurationSessions: 2,
    rewardMultiplier: 0.6,
    rewardFloor: 10,
    xpReward: 15
  },
  mergeGold: {
    baseCost: 10,
    rankMultiplier: 5,
    downgradeChance: 0.3
  },
  leveling: {
    thresholds: [30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700],
    traitRankCaps: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8],
    xpPerCatch: 10,
    xpPerUpgrade: 8,
    xpPerMerge: 25,
    xpPerQuest: 15,
    xpDiscoveryBonus: 20
  },
  discovery: {
    speciesUnlockLevels: {}
  },
  economy: {
    startingGold: 10
  }
};

// src/config/loader.ts
function loadConfig() {
  return balance_default;
}

// src/logger.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var MAX_LOG_SIZE = 5 * 1024 * 1024;
var LOG_DIR = process.env.COMPI_LOG_PATH || path.join(os.homedir(), ".compi");
var LOG_FILE = path.join(LOG_DIR, "compi.log");
function rotateIfNeeded() {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size >= MAX_LOG_SIZE) {
      const backup = LOG_FILE + ".old";
      fs.renameSync(LOG_FILE, backup);
    }
  } catch {
  }
}
function write(level, message, extra) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    rotateIfNeeded();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    let line = `[${timestamp}] ${level.toUpperCase()} ${message}`;
    if (extra) {
      line += " " + JSON.stringify(extra);
    }
    line += "\n";
    fs.appendFileSync(LOG_FILE, line, "utf-8");
  } catch {
  }
}
var logger = {
  debug: (msg, extra) => write("debug", msg, extra),
  info: (msg, extra) => write("info", msg, extra),
  warn: (msg, extra) => write("warn", msg, extra),
  error: (msg, extra) => write("error", msg, extra)
};

// src/state/state-manager.ts
function defaultState() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return {
    version: 5,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalMerges: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: today,
      totalUpgrades: 0,
      totalQuests: 0
    },
    collection: [],
    archive: [],
    energy: loadConfig().energy.maxEnergy,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: {
      notificationLevel: "moderate"
    },
    gold: 10,
    discoveredSpecies: [],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: ""
  };
}
function migrateV3toV4(raw) {
  const state2 = raw;
  if (Array.isArray(state2.collection)) {
    for (const creature of state2.collection) {
      if (!creature.speciesId) creature.speciesId = "compi";
      if (creature.archived === void 0) creature.archived = false;
      delete creature.color;
      if (Array.isArray(creature.slots)) {
        for (const slot of creature.slots) {
          delete slot.rarity;
          if (!slot.color) slot.color = "white";
        }
      }
    }
  }
  if (Array.isArray(state2.nearby)) {
    for (const creature of state2.nearby) {
      if (!creature.speciesId) creature.speciesId = "compi";
      delete creature.color;
      if (Array.isArray(creature.slots)) {
        for (const slot of creature.slots) {
          delete slot.rarity;
          if (!slot.color) slot.color = "white";
        }
      }
    }
  }
  if (!Array.isArray(state2.archive)) {
    state2.archive = [];
  }
  state2.version = 4;
  return state2;
}
function migrateV4toV5(raw) {
  const state2 = raw;
  if (!state2.profile) state2.profile = {};
  if (state2.profile.totalUpgrades === void 0) state2.profile.totalUpgrades = 0;
  if (state2.profile.totalQuests === void 0) state2.profile.totalQuests = 0;
  if (state2.gold === void 0) state2.gold = 10;
  if (state2.discoveredSpecies === void 0) state2.discoveredSpecies = [];
  if (state2.activeQuest === void 0) state2.activeQuest = null;
  if (state2.sessionUpgradeCount === void 0) state2.sessionUpgradeCount = 0;
  if (state2.currentSessionId === void 0) state2.currentSessionId = "";
  state2.version = 5;
  return state2;
}
var StateManager = class {
  constructor(filePath) {
    this.filePath = filePath;
  }
  load() {
    try {
      const data = fs2.readFileSync(this.filePath, "utf-8");
      const raw = JSON.parse(data);
      const version = raw.version;
      if (version === 3) {
        logger.info("Migrating state from v3 to v4", { path: this.filePath });
        const v4 = migrateV3toV4(raw);
        logger.info("Migrating state from v4 to v5", { path: this.filePath });
        return migrateV4toV5(v4);
      }
      if (version === 4) {
        logger.info("Migrating state from v4 to v5", { path: this.filePath });
        return migrateV4toV5(raw);
      }
      if (version !== 5) {
        logger.info("Incompatible state version, creating fresh state", { path: this.filePath });
        return defaultState();
      }
      const state2 = raw;
      if (state2.lastSpawnAt === void 0) {
        state2.lastSpawnAt = 0;
      }
      for (const list of [state2.collection, state2.nearby, state2.archive]) {
        if (Array.isArray(list)) {
          for (const c of list) {
            delete c.color;
            if (Array.isArray(c.slots)) {
              for (const slot of c.slots) {
                if (!slot.color) slot.color = "white";
              }
            }
          }
        }
      }
      return state2;
    } catch (err) {
      const errObj = err;
      const isNotFound = errObj && errObj.code === "ENOENT";
      if (isNotFound) {
        logger.info("No state file found, creating default state", { path: this.filePath });
      } else {
        logger.error("Failed to load state, resetting to default", {
          path: this.filePath,
          error: err instanceof Error ? err.message : String(err)
        });
      }
      return defaultState();
    }
  }
  save(state2) {
    try {
      const dir = path2.dirname(this.filePath);
      fs2.mkdirSync(dir, { recursive: true });
      const tmp = this.filePath + ".tmp";
      fs2.writeFileSync(tmp, JSON.stringify(state2, null, 2), "utf-8");
      try {
        fs2.renameSync(tmp, this.filePath);
      } catch {
        fs2.writeFileSync(this.filePath, JSON.stringify(state2, null, 2), "utf-8");
        try {
          fs2.unlinkSync(tmp);
        } catch {
        }
      }
    } catch (err) {
      logger.error("Failed to save state", {
        path: this.filePath,
        error: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  }
};

// src/config/constants.ts
var config = loadConfig();
var SPAWN_INTERVAL_MS = config.batch.spawnIntervalMs;
var BATCH_LINGER_MS = config.batch.batchLingerMs;
var SHARED_ATTEMPTS = config.batch.sharedAttempts;
var TIME_OF_DAY_RANGES = config.batch.timeOfDay;
var TICK_PRUNE_COUNT = config.progression.tickPruneCount;

// src/engine/ticks.ts
function deriveStreak(lastActiveDate, todayDate, currentStreak) {
  if (lastActiveDate === todayDate) {
    return Math.max(currentStreak, 1);
  }
  const last = /* @__PURE__ */ new Date(lastActiveDate + "T00:00:00");
  const today = /* @__PURE__ */ new Date(todayDate + "T00:00:00");
  const diffDays = Math.floor(
    (today.getTime() - last.getTime()) / (1e3 * 60 * 60 * 24)
  );
  if (diffDays === 1) {
    return currentStreak + 1;
  }
  return 1;
}
function processNewTick(state2, tick) {
  state2.profile.totalTicks++;
  state2.recentTicks.push(tick);
  if (state2.recentTicks.length > TICK_PRUNE_COUNT) {
    state2.recentTicks = state2.recentTicks.slice(-TICK_PRUNE_COUNT);
  }
  const tickDate = new Date(tick.timestamp);
  const todayStr = tickDate.toISOString().split("T")[0];
  state2.profile.currentStreak = deriveStreak(
    state2.profile.lastActiveDate,
    todayStr,
    state2.profile.currentStreak
  );
  state2.profile.longestStreak = Math.max(
    state2.profile.longestStreak,
    state2.profile.currentStreak
  );
  state2.profile.lastActiveDate = todayStr;
}

// config/species/compi.json
var compi_default = {
  id: "compi",
  name: "Compi",
  description: "A small digital axolotl that thrives in terminal environments.",
  spawnWeight: 10,
  art: ["  EE", " (MM)", " \u2571BB\u2572", "  TT"],
  zones: ["eyes", "mouth", "body", "tail"],
  traitPools: {
    eyes: [
      { id: "eye_c01", name: "Pebble Gaze", art: "\u25CB.\u25CB", spawnRate: 0.12 },
      { id: "eye_c02", name: "Dash Sight", art: "-.\u2013", spawnRate: 0.11 },
      { id: "eye_c03", name: "Pip Vision", art: "\xB7.\xB7", spawnRate: 0.1 },
      { id: "eye_c04", name: "Round Look", art: "O.O", spawnRate: 0.09 },
      { id: "eye_c05", name: "Bead Eyes", art: "\xB0.\xB0", spawnRate: 0.08 },
      { id: "eye_u01", name: "Half Moon", art: "\u25D0.\u25D0", spawnRate: 0.07 },
      { id: "eye_u02", name: "Crescent", art: "\u25D1_\u25D1", spawnRate: 0.065 },
      { id: "eye_u03", name: "Owl Sight", art: "\u25CBw\u25CB", spawnRate: 0.06 },
      { id: "eye_u04", name: "Slit Gaze", art: ">.>", spawnRate: 0.055 },
      { id: "eye_r01", name: "Ring Gaze", art: "\u25CE.\u25CE", spawnRate: 0.05 },
      { id: "eye_r02", name: "Dot Sight", art: "\u25CF_\u25CF", spawnRate: 0.045 },
      { id: "eye_r03", name: "Core Eyes", art: "\u25C9w\u25C9", spawnRate: 0.04 },
      { id: "eye_e01", name: "Gem Gaze", art: "\u25C6.\u25C6", spawnRate: 0.03 },
      { id: "eye_e02", name: "Star Dust", art: "\u2756_\u2756", spawnRate: 0.025 },
      { id: "eye_e03", name: "Spark Eyes", art: "\u2726w\u2726", spawnRate: 0.02 },
      { id: "eye_l01", name: "Star Sight", art: "\u2605w\u2605", spawnRate: 0.015 },
      { id: "eye_l02", name: "Moon Eyes", art: "\u2606_\u2606", spawnRate: 0.01 },
      { id: "eye_m01", name: "Void Gaze", art: "\u2299_\u2299", spawnRate: 7e-3 },
      { id: "eye_m02", name: "Prism Eyes", art: "\u25C8_\u25C8", spawnRate: 3e-3 }
    ],
    mouth: [
      { id: "mth_c01", name: "Flat Line", art: " - ", spawnRate: 0.12 },
      { id: "mth_c02", name: "Wave", art: " ~ ", spawnRate: 0.11 },
      { id: "mth_c03", name: "Smile", art: " \u25E1 ", spawnRate: 0.1 },
      { id: "mth_c04", name: "Dot", art: " . ", spawnRate: 0.09 },
      { id: "mth_c05", name: "Underline", art: " _ ", spawnRate: 0.08 },
      { id: "mth_u01", name: "Circle", art: " \u2218 ", spawnRate: 0.07 },
      { id: "mth_u02", name: "Ripple", art: " \u2248 ", spawnRate: 0.065 },
      { id: "mth_u03", name: "Curve", art: " \u2312 ", spawnRate: 0.06 },
      { id: "mth_u04", name: "Whisker", art: " v ", spawnRate: 0.055 },
      { id: "mth_r01", name: "Omega", art: " \u03C9 ", spawnRate: 0.05 },
      { id: "mth_r02", name: "Swirl", art: " \u223F ", spawnRate: 0.045 },
      { id: "mth_r03", name: "Triangle", art: " \u25B3 ", spawnRate: 0.04 },
      { id: "mth_e01", name: "Prism", art: " \u2207 ", spawnRate: 0.03 },
      { id: "mth_e02", name: "Void", art: " \u2297 ", spawnRate: 0.025 },
      { id: "mth_e03", name: "Gem", art: " \u25C7 ", spawnRate: 0.02 },
      { id: "mth_l01", name: "Diamond", art: " \u25C7 ", spawnRate: 0.015 },
      { id: "mth_l02", name: "Spark", art: " \u2726 ", spawnRate: 0.01 },
      { id: "mth_m01", name: "Core", art: " \u2297 ", spawnRate: 7e-3 },
      { id: "mth_m02", name: "Nova", art: " \u2726 ", spawnRate: 3e-3 }
    ],
    body: [
      { id: "bod_c01", name: "Dots", art: " \u2591\u2591 ", spawnRate: 0.12 },
      { id: "bod_c02", name: "Light", art: " \xB7\xB7 ", spawnRate: 0.11 },
      { id: "bod_c03", name: "Plain", art: " -- ", spawnRate: 0.1 },
      { id: "bod_c04", name: "Thin", art: " :: ", spawnRate: 0.09 },
      { id: "bod_c05", name: "Faint", art: " \u2219\u2219 ", spawnRate: 0.08 },
      { id: "bod_u01", name: "Shade", art: " \u2592\u2592 ", spawnRate: 0.07 },
      { id: "bod_u02", name: "Mesh", art: " ## ", spawnRate: 0.065 },
      { id: "bod_u03", name: "Grain", art: " \u2591\u2592 ", spawnRate: 0.06 },
      { id: "bod_u04", name: "Cross", art: " ++ ", spawnRate: 0.055 },
      { id: "bod_r01", name: "Crystal", art: " \u2593\u2593 ", spawnRate: 0.05 },
      { id: "bod_r02", name: "Wave", art: " \u2248\u2248 ", spawnRate: 0.045 },
      { id: "bod_r03", name: "Pulse", art: " \u223F\u223F ", spawnRate: 0.04 },
      { id: "bod_e01", name: "Shell", art: " \u25C6\u25C6 ", spawnRate: 0.03 },
      { id: "bod_e02", name: "Core", art: " \u2299\u2299 ", spawnRate: 0.025 },
      { id: "bod_e03", name: "Facet", art: " \u25C8\u25C8 ", spawnRate: 0.02 },
      { id: "bod_l01", name: "Hex", art: " \u2B21\u2B21 ", spawnRate: 0.015 },
      { id: "bod_l02", name: "Star", art: " \u2726\u2726 ", spawnRate: 0.01 },
      { id: "bod_m01", name: "Prism", art: " \u25C8\u25C8 ", spawnRate: 7e-3 },
      { id: "bod_m02", name: "Void", art: " \u2299\u2299 ", spawnRate: 3e-3 }
    ],
    tail: [
      { id: "tal_c01", name: "Curl", art: "~~/", spawnRate: 0.12 },
      { id: "tal_c02", name: "Swish", art: "\\~\\", spawnRate: 0.11 },
      { id: "tal_c03", name: "Stub", art: "_v_", spawnRate: 0.1 },
      { id: "tal_c04", name: "Droop", art: "___", spawnRate: 0.09 },
      { id: "tal_c05", name: "Flick", art: "~/~", spawnRate: 0.08 },
      { id: "tal_u01", name: "Zigzag", art: "\u2307\u2307", spawnRate: 0.07 },
      { id: "tal_u02", name: "Drift", art: "\u223F\u223F", spawnRate: 0.065 },
      { id: "tal_u03", name: "Whirl", art: "~~\u2307", spawnRate: 0.06 },
      { id: "tal_u04", name: "Wag", art: "~\u2307~", spawnRate: 0.055 },
      { id: "tal_r01", name: "Ripple", art: "\u224B\u224B", spawnRate: 0.05 },
      { id: "tal_r02", name: "Bolt", art: "\u21AF\u21AF", spawnRate: 0.045 },
      { id: "tal_r03", name: "Fork", art: "\\\u2307/", spawnRate: 0.04 },
      { id: "tal_e01", name: "Lightning", art: "\\\u26A1/", spawnRate: 0.03 },
      { id: "tal_e02", name: "Infinity", art: "\\\u221E/", spawnRate: 0.025 },
      { id: "tal_e03", name: "Shimmer", art: "\u2727\u2727", spawnRate: 0.02 },
      { id: "tal_l01", name: "Comet", art: "\u2604\u2604", spawnRate: 0.015 },
      { id: "tal_l02", name: "Glitter", art: "\\\u2727/", spawnRate: 0.01 },
      { id: "tal_m01", name: "Supernova", art: "\u2604\u2727\u2604", spawnRate: 7e-3 },
      { id: "tal_m02", name: "Eternal", art: "\\\u221E/", spawnRate: 3e-3 }
    ]
  }
};

// config/species/flikk.json
var flikk_default = {
  id: "flikk",
  name: "Flikk",
  description: "A twitchy, buzzing creature that seems to vibrate in place. Always mid-movement.",
  spawnWeight: 11,
  art: ["  \\ _ /", " ( EE )", " ( MM )", "  ~BB~", "   \\/"],
  zones: ["tail", "eyes", "mouth", "body", "tail"],
  traitPools: {
    eyes: [
      { id: "flk_eye_01", name: "Blink", art: "\u2022.\u2022", spawnRate: 0.12 },
      { id: "flk_eye_02", name: "Twitch", art: "\xB7,\xB7", spawnRate: 0.11 },
      { id: "flk_eye_03", name: "Peek", art: "\xB0.\xB0", spawnRate: 0.1 },
      { id: "flk_eye_04", name: "Dart", art: ">.<", spawnRate: 0.09 },
      { id: "flk_eye_05", name: "Flick", art: "\u2022,\xB0", spawnRate: 0.08 },
      { id: "flk_eye_06", name: "Rattle", art: "\xB0,\xB0", spawnRate: 0.07 },
      { id: "flk_eye_07", name: "Wobble", art: "\u25E6.\u25E6", spawnRate: 0.065 },
      { id: "flk_eye_08", name: "Skip", art: "\xB7.\xB0", spawnRate: 0.06 },
      { id: "flk_eye_09", name: "Zap", art: "\u26A1.\u26A1", spawnRate: 0.055 },
      { id: "flk_eye_10", name: "Snap", art: "\u25C7.\u25C7", spawnRate: 0.05 },
      { id: "flk_eye_11", name: "Buzz", art: "\u25E6,\u25E6", spawnRate: 0.045 },
      { id: "flk_eye_12", name: "Jolt", art: "\u2B21.\u2B21", spawnRate: 0.04 },
      { id: "flk_eye_13", name: "Spark", art: "\u2726.\u2726", spawnRate: 0.03 },
      { id: "flk_eye_14", name: "Surge", art: "\u25C8.\u25C8", spawnRate: 0.02 },
      { id: "flk_eye_15", name: "Bolt", art: "\u2605.\u2605", spawnRate: 0.01 },
      { id: "flk_eye_16", name: "Overload", art: "\u2727.\u2727", spawnRate: 5e-3 }
    ],
    mouth: [
      { id: "flk_mth_01", name: "Chatter", art: "^^^", spawnRate: 0.14 },
      { id: "flk_mth_02", name: "Buzz", art: "~~~", spawnRate: 0.13 },
      { id: "flk_mth_03", name: "Pip", art: ".^.", spawnRate: 0.12 },
      { id: "flk_mth_04", name: "Click", art: "_^_", spawnRate: 0.1 },
      { id: "flk_mth_05", name: "Rattle", art: "^~^", spawnRate: 0.09 },
      { id: "flk_mth_06", name: "Crackle", art: "\u2307^\u2307", spawnRate: 0.08 },
      { id: "flk_mth_07", name: "Hum", art: "\u223F\u223F\u223F", spawnRate: 0.07 },
      { id: "flk_mth_08", name: "Whirr", art: "~^~", spawnRate: 0.06 },
      { id: "flk_mth_09", name: "Snap", art: "\u2307~\u2307", spawnRate: 0.04 },
      { id: "flk_mth_10", name: "Jolt", art: "\u21AF^\u21AF", spawnRate: 0.03 },
      { id: "flk_mth_11", name: "Screech", art: "\u26A1^\u26A1", spawnRate: 0.02 },
      { id: "flk_mth_12", name: "Shriek", art: "\u2727^\u2727", spawnRate: 0.01 },
      { id: "flk_mth_13", name: "Shatter", art: "\u2726^\u2726", spawnRate: 5e-3 }
    ],
    body: [
      { id: "flk_bod_01", name: "Shiver", art: "\u2591\u2591", spawnRate: 0.11 },
      { id: "flk_bod_02", name: "Fuzz", art: "\xB7\xB7", spawnRate: 0.1 },
      { id: "flk_bod_03", name: "Haze", art: "\u2219\u2219", spawnRate: 0.09 },
      { id: "flk_bod_04", name: "Flicker", art: "::", spawnRate: 0.08 },
      { id: "flk_bod_05", name: "Jitter", art: "\u2307\u2307", spawnRate: 0.07 },
      { id: "flk_bod_06", name: "Quiver", art: "~~", spawnRate: 0.065 },
      { id: "flk_bod_07", name: "Pulse", art: "\u223F\u223F", spawnRate: 0.06 },
      { id: "flk_bod_08", name: "Crackle", art: "\u2248\u2248", spawnRate: 0.055 },
      { id: "flk_bod_09", name: "Charge", art: "\u2592\u2592", spawnRate: 0.05 },
      { id: "flk_bod_10", name: "Rattle", art: "\u2307\u223F", spawnRate: 0.045 },
      { id: "flk_bod_11", name: "Spark", art: "++", spawnRate: 0.04 },
      { id: "flk_bod_12", name: "Bolt", art: "\u21AF\u21AF", spawnRate: 0.03 },
      { id: "flk_bod_13", name: "Storm", art: "\u2593\u2593", spawnRate: 0.025 },
      { id: "flk_bod_14", name: "Surge", art: "\u25C8\u25C8", spawnRate: 0.02 },
      { id: "flk_bod_15", name: "Overcharge", art: "\u26A1\u26A1", spawnRate: 0.015 },
      { id: "flk_bod_16", name: "Meltdown", art: "\u2726\u2726", spawnRate: 7e-3 },
      { id: "flk_bod_17", name: "Supercell", art: "\u2605\u2605", spawnRate: 3e-3 }
    ],
    tail: [
      { id: "flk_tal_01", name: "Whip", art: "~/~", spawnRate: 0.13 },
      { id: "flk_tal_02", name: "Snap", art: "~\\~", spawnRate: 0.12 },
      { id: "flk_tal_03", name: "Flick", art: "\u2307/", spawnRate: 0.11 },
      { id: "flk_tal_04", name: "Twitch", art: "/\u2307", spawnRate: 0.1 },
      { id: "flk_tal_05", name: "Wiggle", art: "~\u2307~", spawnRate: 0.09 },
      { id: "flk_tal_06", name: "Lash", art: "\u2307~\u2307", spawnRate: 0.08 },
      { id: "flk_tal_07", name: "Crack", art: "/~\\", spawnRate: 0.07 },
      { id: "flk_tal_08", name: "Spark", art: "~\u26A1", spawnRate: 0.06 },
      { id: "flk_tal_09", name: "Arc", art: "\u2307\u26A1", spawnRate: 0.04 },
      { id: "flk_tal_10", name: "Bolt", art: "\u21AF~\u21AF", spawnRate: 0.03 },
      { id: "flk_tal_11", name: "Fork", art: "\u26A1\u2307\u26A1", spawnRate: 0.025 },
      { id: "flk_tal_12", name: "Lightning", art: "\u2727\u2307\u2727", spawnRate: 0.02 },
      { id: "flk_tal_13", name: "Tempest", art: "\u26A1\u21AF\u26A1", spawnRate: 0.01 },
      { id: "flk_tal_14", name: "Cataclysm", art: "\u2727\u21AF\u2727", spawnRate: 5e-3 }
    ]
  }
};

// config/species/glich.json
var glich_default = {
  id: "glich",
  name: "Glich",
  description: "A rendering error that became sentient. Parts flicker, repeat, or seem corrupted.",
  spawnWeight: 8,
  art: [" \u2590\u2591\u2591\u2591\u258C", " \u2590EE\u258C", " \u2590 MM \u258C", " \u2590BB\u258C", "  TT"],
  zones: ["body", "eyes", "mouth", "body", "tail"],
  traitPools: {
    eyes: [
      { id: "glc_eye_01", name: "Static", art: "\xB7.\xB7", spawnRate: 0.1 },
      { id: "glc_eye_02", name: "Flicker", art: "\xB0.\xB0", spawnRate: 0.09 },
      { id: "glc_eye_03", name: "Scan", art: "-.\u2013", spawnRate: 0.08 },
      { id: "glc_eye_04", name: "Pixel", art: "\u2022.\u2022", spawnRate: 0.08 },
      { id: "glc_eye_05", name: "Skip", art: "\xB7,\xB7", spawnRate: 0.07 },
      { id: "glc_eye_06", name: "Tear", art: "\xB0,\xB0", spawnRate: 0.065 },
      { id: "glc_eye_07", name: "Glitch", art: "\u25E6.\u25E6", spawnRate: 0.06 },
      { id: "glc_eye_08", name: "Corrupt", art: ">.<", spawnRate: 0.055 },
      { id: "glc_eye_09", name: "Fragment", art: "\u25D0.\u25D0", spawnRate: 0.05 },
      { id: "glc_eye_10", name: "Distort", art: "\u25D1.\u25D1", spawnRate: 0.045 },
      { id: "glc_eye_11", name: "Scramble", art: "\u25CE.\u25CE", spawnRate: 0.04 },
      { id: "glc_eye_12", name: "Breach", art: "\u25C7.\u25C7", spawnRate: 0.03 },
      { id: "glc_eye_13", name: "Damage", art: "\u25C8.\u25C8", spawnRate: 0.025 },
      { id: "glc_eye_14", name: "Fracture", art: "\u2B21.\u2B21", spawnRate: 0.02 },
      { id: "glc_eye_15", name: "Rift", art: "\u25C9.\u25C9", spawnRate: 0.015 },
      { id: "glc_eye_16", name: "Void", art: "\u2299.\u2299", spawnRate: 0.01 },
      { id: "glc_eye_17", name: "Null", art: "\u2605.\u2605", spawnRate: 5e-3 },
      { id: "glc_eye_18", name: "Fatal", art: "\u2727.\u2727", spawnRate: 3e-3 }
    ],
    mouth: [
      { id: "glc_mth_01", name: "Noise", art: "~~~", spawnRate: 0.13 },
      { id: "glc_mth_02", name: "Static", art: "---", spawnRate: 0.12 },
      { id: "glc_mth_03", name: "Buzz", art: "^^^", spawnRate: 0.11 },
      { id: "glc_mth_04", name: "Skip", art: "_._", spawnRate: 0.1 },
      { id: "glc_mth_05", name: "Stutter", art: "^.^", spawnRate: 0.09 },
      { id: "glc_mth_06", name: "Crackle", art: "\u2307.\u2307", spawnRate: 0.08 },
      { id: "glc_mth_07", name: "Tear", art: "~\u2307~", spawnRate: 0.07 },
      { id: "glc_mth_08", name: "Corrupt", art: "\u2307~\u2307", spawnRate: 0.05 },
      { id: "glc_mth_09", name: "Distort", art: "\u223F.\u223F", spawnRate: 0.04 },
      { id: "glc_mth_10", name: "Break", art: "\u21AF.\u21AF", spawnRate: 0.03 },
      { id: "glc_mth_11", name: "Crash", art: "\u26A1.\u26A1", spawnRate: 0.02 },
      { id: "glc_mth_12", name: "Fault", art: "\u25B3", spawnRate: 0.015 },
      { id: "glc_mth_13", name: "Kernel", art: "\u2727.\u2727", spawnRate: 0.01 },
      { id: "glc_mth_14", name: "Panic", art: "\u2726.\u2726", spawnRate: 5e-3 }
    ],
    body: [
      { id: "glc_bod_01", name: "Snow", art: "\u2591\u2591", spawnRate: 0.1 },
      { id: "glc_bod_02", name: "Noise", art: "\xB7\xB7", spawnRate: 0.09 },
      { id: "glc_bod_03", name: "Fuzz", art: "\u2219\u2219", spawnRate: 0.08 },
      { id: "glc_bod_04", name: "Scan", art: "::", spawnRate: 0.07 },
      { id: "glc_bod_05", name: "Line", art: "--", spawnRate: 0.065 },
      { id: "glc_bod_06", name: "Tear", art: "\u2307\u2307", spawnRate: 0.06 },
      { id: "glc_bod_07", name: "Grain", art: "~~", spawnRate: 0.055 },
      { id: "glc_bod_08", name: "Static", art: "\u2592\u2592", spawnRate: 0.05 },
      { id: "glc_bod_09", name: "Corrupt", art: "\u2248\u2248", spawnRate: 0.045 },
      { id: "glc_bod_10", name: "Artifact", art: "\u223F\u223F", spawnRate: 0.04 },
      { id: "glc_bod_11", name: "Glitch", art: "++", spawnRate: 0.035 },
      { id: "glc_bod_12", name: "Damage", art: "##", spawnRate: 0.03 },
      { id: "glc_bod_13", name: "Crash", art: "\u2593\u2593", spawnRate: 0.025 },
      { id: "glc_bod_14", name: "Fragment", art: "\u21AF\u21AF", spawnRate: 0.02 },
      { id: "glc_bod_15", name: "Breach", art: "\u25C8\u25C8", spawnRate: 0.018 },
      { id: "glc_bod_16", name: "Fracture", art: "\u25C6\u25C6", spawnRate: 0.015 },
      { id: "glc_bod_17", name: "Rift", art: "\u2B21\u2B21", spawnRate: 7e-3 },
      { id: "glc_bod_18", name: "Void", art: "\u2605\u2605", spawnRate: 5e-3 },
      { id: "glc_bod_19", name: "Fatal", art: "\u2727\u2727", spawnRate: 3e-3 }
    ],
    tail: [
      { id: "glc_tal_01", name: "Flicker", art: "~/", spawnRate: 0.11 },
      { id: "glc_tal_02", name: "Skip", art: "/~", spawnRate: 0.1 },
      { id: "glc_tal_03", name: "Stutter", art: "~~", spawnRate: 0.09 },
      { id: "glc_tal_04", name: "Tear", art: "\u2307/", spawnRate: 0.08 },
      { id: "glc_tal_05", name: "Jitter", art: "/\u2307", spawnRate: 0.07 },
      { id: "glc_tal_06", name: "Noise", art: "~\u2307~", spawnRate: 0.065 },
      { id: "glc_tal_07", name: "Static", art: "\u2307~\u2307", spawnRate: 0.06 },
      { id: "glc_tal_08", name: "Corrupt", art: "/~\\", spawnRate: 0.05 },
      { id: "glc_tal_09", name: "Glitch", art: "\u2307\u2307", spawnRate: 0.04 },
      { id: "glc_tal_10", name: "Artifact", art: "\u21AF~", spawnRate: 0.035 },
      { id: "glc_tal_11", name: "Crash", art: "\u21AF\u21AF", spawnRate: 0.03 },
      { id: "glc_tal_12", name: "Damage", art: "\u21AF~\u21AF", spawnRate: 0.025 },
      { id: "glc_tal_13", name: "Fragment", art: "\u26A1\u2307", spawnRate: 0.02 },
      { id: "glc_tal_14", name: "Breach", art: "\u26A1\u2307\u26A1", spawnRate: 0.015 },
      { id: "glc_tal_15", name: "Fracture", art: "\u2727\u2307\u2727", spawnRate: 0.01 },
      { id: "glc_tal_16", name: "Rift", art: "\u26A1\u21AF\u26A1", spawnRate: 5e-3 },
      { id: "glc_tal_17", name: "Fatal", art: "\u2604\u21AF\u2604", spawnRate: 3e-3 }
    ]
  }
};

// config/species/jinx.json
var jinx_default = {
  id: "jinx",
  name: "Jinx",
  description: "A cheeky little trickster. Asymmetric on purpose \u2014 nothing lines up right.",
  spawnWeight: 11,
  art: ["    ~", "  /EE )", " ( MM /", "  \\BB )", "   TT~"],
  zones: ["tail", "eyes", "mouth", "body", "tail"],
  traitPools: {
    eyes: [
      { id: "jnx_eye_01", name: "Peek", art: "\xB7.\xB7", spawnRate: 0.13 },
      { id: "jnx_eye_02", name: "Squint", art: "\xB0.\xB0", spawnRate: 0.11 },
      { id: "jnx_eye_03", name: "Wink", art: "\xB7.\xB0", spawnRate: 0.1 },
      { id: "jnx_eye_04", name: "Smirk", art: "\xB0.\xB7", spawnRate: 0.09 },
      { id: "jnx_eye_05", name: "Shifty", art: ">.>", spawnRate: 0.08 },
      { id: "jnx_eye_06", name: "Cross", art: "\xB0.\u25E6", spawnRate: 0.07 },
      { id: "jnx_eye_07", name: "Sly", art: "\u25E6.\xB0", spawnRate: 0.065 },
      { id: "jnx_eye_08", name: "Sneak", art: "\u25E6.\u25E6", spawnRate: 0.06 },
      { id: "jnx_eye_09", name: "Trick", art: "\u25D0.\u25D1", spawnRate: 0.05 },
      { id: "jnx_eye_10", name: "Scheme", art: "\u25D1.\u25D0", spawnRate: 0.04 },
      { id: "jnx_eye_11", name: "Prank", art: "\u25CE.\u25CE", spawnRate: 0.03 },
      { id: "jnx_eye_12", name: "Hustle", art: "\u25C8.\u25C7", spawnRate: 0.025 },
      { id: "jnx_eye_13", name: "Con", art: "\u25C7.\u25C8", spawnRate: 0.02 },
      { id: "jnx_eye_14", name: "Heist", art: "\u2605.\u2606", spawnRate: 0.01 },
      { id: "jnx_eye_15", name: "Chaos", art: "\u2606.\u2605", spawnRate: 5e-3 }
    ],
    mouth: [
      { id: "jnx_mth_01", name: "Grin", art: "^^^", spawnRate: 0.11 },
      { id: "jnx_mth_02", name: "Giggle", art: "~~~", spawnRate: 0.1 },
      { id: "jnx_mth_03", name: "Snicker", art: "^~^", spawnRate: 0.09 },
      { id: "jnx_mth_04", name: "Tease", art: ".^.", spawnRate: 0.08 },
      { id: "jnx_mth_05", name: "Smirk", art: "~^~", spawnRate: 0.07 },
      { id: "jnx_mth_06", name: "Hehe", art: "^.^", spawnRate: 0.065 },
      { id: "jnx_mth_07", name: "Cackle", art: "\u2307^\u2307", spawnRate: 0.06 },
      { id: "jnx_mth_08", name: "Taunt", art: "~\u2307~", spawnRate: 0.055 },
      { id: "jnx_mth_09", name: "Chortle", art: "\u223F^\u223F", spawnRate: 0.05 },
      { id: "jnx_mth_10", name: "Jeer", art: "\u2307~\u2307", spawnRate: 0.04 },
      { id: "jnx_mth_11", name: "Mock", art: "\u2248^\u2248", spawnRate: 0.035 },
      { id: "jnx_mth_12", name: "Howl", art: "\u21AF^\u21AF", spawnRate: 0.03 },
      { id: "jnx_mth_13", name: "Crazed", art: "\u223F~\u223F", spawnRate: 0.025 },
      { id: "jnx_mth_14", name: "Mayhem", art: "\u2727^\u2727", spawnRate: 0.02 },
      { id: "jnx_mth_15", name: "Havoc", art: "\u26A1^\u26A1", spawnRate: 0.01 },
      { id: "jnx_mth_16", name: "Bedlam", art: "\u2726^\u2726", spawnRate: 7e-3 },
      { id: "jnx_mth_17", name: "Anarchy", art: "\u2605^\u2605", spawnRate: 3e-3 }
    ],
    body: [
      { id: "jnx_bod_01", name: "Scruffy", art: "\u2591\u2591", spawnRate: 0.14 },
      { id: "jnx_bod_02", name: "Messy", art: "\xB7\xB7", spawnRate: 0.13 },
      { id: "jnx_bod_03", name: "Tangle", art: "\u2219\u2219", spawnRate: 0.11 },
      { id: "jnx_bod_04", name: "Rumple", art: "::", spawnRate: 0.1 },
      { id: "jnx_bod_05", name: "Jumble", art: "~~", spawnRate: 0.09 },
      { id: "jnx_bod_06", name: "Wobble", art: "\u2307\u2307", spawnRate: 0.08 },
      { id: "jnx_bod_07", name: "Tumble", art: "\u2592\u2592", spawnRate: 0.07 },
      { id: "jnx_bod_08", name: "Scramble", art: "\u2248\u2248", spawnRate: 0.06 },
      { id: "jnx_bod_09", name: "Muddle", art: "\u223F\u223F", spawnRate: 0.04 },
      { id: "jnx_bod_10", name: "Ruckus", art: "\u2593\u2593", spawnRate: 0.03 },
      { id: "jnx_bod_11", name: "Havoc", art: "\u25C6\u25C6", spawnRate: 0.02 },
      { id: "jnx_bod_12", name: "Pandemonium", art: "\u25C8\u25C8", spawnRate: 0.01 },
      { id: "jnx_bod_13", name: "Riot", art: "\u2605\u2605", spawnRate: 5e-3 }
    ],
    tail: [
      { id: "jnx_tal_01", name: "Swish", art: "~/", spawnRate: 0.13 },
      { id: "jnx_tal_02", name: "Flap", art: "/~", spawnRate: 0.11 },
      { id: "jnx_tal_03", name: "Wag", art: "~~", spawnRate: 0.1 },
      { id: "jnx_tal_04", name: "Trip", art: "/\u2307", spawnRate: 0.09 },
      { id: "jnx_tal_05", name: "Stumble", art: "\u2307/", spawnRate: 0.08 },
      { id: "jnx_tal_06", name: "Tangle", art: "~\u2307~", spawnRate: 0.07 },
      { id: "jnx_tal_07", name: "Knot", art: "\u2307~\u2307", spawnRate: 0.06 },
      { id: "jnx_tal_08", name: "Whirl", art: "/~\\", spawnRate: 0.05 },
      { id: "jnx_tal_09", name: "Snarl", art: "\u2307\u2307", spawnRate: 0.04 },
      { id: "jnx_tal_10", name: "Twist", art: "\u21AF~\u21AF", spawnRate: 0.03 },
      { id: "jnx_tal_11", name: "Chaos", art: "\u26A1\u2307\u26A1", spawnRate: 0.025 },
      { id: "jnx_tal_12", name: "Mayhem", art: "\u2727\u2307\u2727", spawnRate: 0.02 },
      { id: "jnx_tal_13", name: "Havoc", art: "\u26A1\u21AF\u26A1", spawnRate: 0.01 },
      { id: "jnx_tal_14", name: "Bedlam", art: "\u2727\u21AF\u2727", spawnRate: 7e-3 },
      { id: "jnx_tal_15", name: "Anarchy", art: "\u2604\u21AF\u2604", spawnRate: 3e-3 }
    ]
  }
};

// config/species/monu.json
var monu_default = {
  id: "monu",
  name: "Monu",
  description: "A slow, heavy presence. Feels like it has been sitting in the same spot for centuries.",
  spawnWeight: 9,
  art: [" \u250C\u2500\u2500\u2500\u2500\u2500\u2510", " \u2502EE\u2502", " \u2502 MM \u2502", " \u2502BB\u2502", " \u2514TT\u2518"],
  zones: ["body", "eyes", "mouth", "body", "tail"],
  traitPools: {
    eyes: [
      { id: "mnu_eye_01", name: "Pebble", art: "\xB7.\xB7", spawnRate: 0.15 },
      { id: "mnu_eye_02", name: "Settled", art: "\xB0.\xB0", spawnRate: 0.13 },
      { id: "mnu_eye_03", name: "Worn", art: "-.\u2013", spawnRate: 0.12 },
      { id: "mnu_eye_04", name: "Still", art: "\u25CB.\u25CB", spawnRate: 0.1 },
      { id: "mnu_eye_05", name: "Lichen", art: "\u25E6.\u25E6", spawnRate: 0.09 },
      { id: "mnu_eye_06", name: "Moss", art: "\u25D0.\u25D0", spawnRate: 0.08 },
      { id: "mnu_eye_07", name: "Deep", art: "\u25D1.\u25D1", spawnRate: 0.07 },
      { id: "mnu_eye_08", name: "Root", art: "\u25CE.\u25CE", spawnRate: 0.06 },
      { id: "mnu_eye_09", name: "Fossil", art: "\u25C9.\u25C9", spawnRate: 0.05 },
      { id: "mnu_eye_10", name: "Bedrock", art: "\u25CF.\u25CF", spawnRate: 0.03 },
      { id: "mnu_eye_11", name: "Monolith", art: "\u2299.\u2299", spawnRate: 0.015 },
      { id: "mnu_eye_12", name: "Eternal", art: "\u25C8.\u25C8", spawnRate: 5e-3 }
    ],
    mouth: [
      { id: "mnu_mth_01", name: "Flat", art: "_", spawnRate: 0.16 },
      { id: "mnu_mth_02", name: "Hum", art: "~", spawnRate: 0.14 },
      { id: "mnu_mth_03", name: "Settle", art: ".", spawnRate: 0.12 },
      { id: "mnu_mth_04", name: "Rumble", art: "\u2248", spawnRate: 0.11 },
      { id: "mnu_mth_05", name: "Drone", art: "\u2218", spawnRate: 0.1 },
      { id: "mnu_mth_06", name: "Erode", art: "\u223F", spawnRate: 0.09 },
      { id: "mnu_mth_07", name: "Groan", art: "\u2312", spawnRate: 0.07 },
      { id: "mnu_mth_08", name: "Quake", art: "\u03C9", spawnRate: 0.06 },
      { id: "mnu_mth_09", name: "Tremor", art: "\u25B3", spawnRate: 0.05 },
      { id: "mnu_mth_10", name: "Chasm", art: "\u25C7", spawnRate: 0.03 },
      { id: "mnu_mth_11", name: "Epoch", art: "\u2726", spawnRate: 0.01 }
    ],
    body: [
      { id: "mnu_bod_01", name: "Dust", art: "\xB7\xB7", spawnRate: 0.1 },
      { id: "mnu_bod_02", name: "Silt", art: "\u2219\u2219", spawnRate: 0.09 },
      { id: "mnu_bod_03", name: "Clay", art: "::", spawnRate: 0.08 },
      { id: "mnu_bod_04", name: "Grit", art: "\u2591\u2591", spawnRate: 0.08 },
      { id: "mnu_bod_05", name: "Sand", art: "--", spawnRate: 0.07 },
      { id: "mnu_bod_06", name: "Shale", art: "\u2307\u2307", spawnRate: 0.065 },
      { id: "mnu_bod_07", name: "Stone", art: "\u2592\u2592", spawnRate: 0.06 },
      { id: "mnu_bod_08", name: "Slate", art: "\u2248\u2248", spawnRate: 0.055 },
      { id: "mnu_bod_09", name: "Basalt", art: "++", spawnRate: 0.05 },
      { id: "mnu_bod_10", name: "Granite", art: "\u223F\u223F", spawnRate: 0.045 },
      { id: "mnu_bod_11", name: "Ore", art: "##", spawnRate: 0.04 },
      { id: "mnu_bod_12", name: "Iron", art: "\u2593\u2593", spawnRate: 0.035 },
      { id: "mnu_bod_13", name: "Marble", art: "\u25C8\u25C8", spawnRate: 0.03 },
      { id: "mnu_bod_14", name: "Obsidian", art: "\u25C6\u25C6", spawnRate: 0.025 },
      { id: "mnu_bod_15", name: "Amber", art: "\u2B21\u2B21", spawnRate: 0.02 },
      { id: "mnu_bod_16", name: "Fossil", art: "\u2299\u2299", spawnRate: 0.01 },
      { id: "mnu_bod_17", name: "Relic", art: "\u2726\u2726", spawnRate: 5e-3 },
      { id: "mnu_bod_18", name: "Core", art: "\u2605\u2605", spawnRate: 3e-3 }
    ],
    tail: [
      { id: "mnu_tal_01", name: "Drag", art: "~~", spawnRate: 0.15 },
      { id: "mnu_tal_02", name: "Scrape", art: "_/", spawnRate: 0.13 },
      { id: "mnu_tal_03", name: "Slide", art: "~/", spawnRate: 0.12 },
      { id: "mnu_tal_04", name: "Trail", art: "/\\", spawnRate: 0.1 },
      { id: "mnu_tal_05", name: "Grind", art: "\u2307~", spawnRate: 0.09 },
      { id: "mnu_tal_06", name: "Root", art: "~\u2307", spawnRate: 0.08 },
      { id: "mnu_tal_07", name: "Crack", art: "/\u2307\\", spawnRate: 0.07 },
      { id: "mnu_tal_08", name: "Tremor", art: "\u2307\u2307", spawnRate: 0.05 },
      { id: "mnu_tal_09", name: "Quake", art: "\u224B\u224B", spawnRate: 0.04 },
      { id: "mnu_tal_10", name: "Fossil", art: "\u2604~", spawnRate: 0.03 },
      { id: "mnu_tal_11", name: "Ancient", art: "\u2604\u2604", spawnRate: 0.02 },
      { id: "mnu_tal_12", name: "Tectonic", art: "\u2727\u2727", spawnRate: 5e-3 }
    ]
  }
};

// config/species/whiski.json
var whiski_default = {
  id: "whiski",
  name: "Whiski",
  description: "A rare, elusive cat. Quiet and always just out of reach.",
  spawnWeight: 5,
  art: [" /\\_/\\", "( EE )", " > MM <", "  TT"],
  zones: ["eyes", "eyes", "mouth", "tail"],
  traitPools: {
    eyes: [
      { id: "wsk_eye_01", name: "Peer", art: "\xB7.\xB7", spawnRate: 0.11 },
      { id: "wsk_eye_02", name: "Watch", art: "\xB0.\xB0", spawnRate: 0.1 },
      { id: "wsk_eye_03", name: "Gaze", art: "\u2022.\u2022", spawnRate: 0.09 },
      { id: "wsk_eye_04", name: "Glance", art: "-.\u2013", spawnRate: 0.08 },
      { id: "wsk_eye_05", name: "Stare", art: "\u25CB.\u25CB", spawnRate: 0.07 },
      { id: "wsk_eye_06", name: "Lurk", art: "\u25E6.\u25E6", spawnRate: 0.065 },
      { id: "wsk_eye_07", name: "Prowl", art: ">.>", spawnRate: 0.06 },
      { id: "wsk_eye_08", name: "Slit", art: "\u25D0.\u25D0", spawnRate: 0.055 },
      { id: "wsk_eye_09", name: "Shadow", art: "\u25D1.\u25D1", spawnRate: 0.05 },
      { id: "wsk_eye_10", name: "Night", art: "\u25CE.\u25CE", spawnRate: 0.045 },
      { id: "wsk_eye_11", name: "Dusk", art: "\u25CF.\u25CF", spawnRate: 0.04 },
      { id: "wsk_eye_12", name: "Glint", art: "\u25C7.\u25C7", spawnRate: 0.03 },
      { id: "wsk_eye_13", name: "Flash", art: "\u25C8.\u25C8", spawnRate: 0.025 },
      { id: "wsk_eye_14", name: "Moon", art: "\u25C9.\u25C9", spawnRate: 0.02 },
      { id: "wsk_eye_15", name: "Eclipse", art: "\u2299.\u2299", spawnRate: 0.01 },
      { id: "wsk_eye_16", name: "Phantom", art: "\u2605.\u2605", spawnRate: 7e-3 },
      { id: "wsk_eye_17", name: "Ghost", art: "\u2727.\u2727", spawnRate: 3e-3 }
    ],
    mouth: [
      { id: "wsk_mth_01", name: "Purr", art: "~~~", spawnRate: 0.11 },
      { id: "wsk_mth_02", name: "Mew", art: "^", spawnRate: 0.1 },
      { id: "wsk_mth_03", name: "Hush", art: "_", spawnRate: 0.09 },
      { id: "wsk_mth_04", name: "Nuzzle", art: "~", spawnRate: 0.08 },
      { id: "wsk_mth_05", name: "Chirp", art: "^.^", spawnRate: 0.07 },
      { id: "wsk_mth_06", name: "Trill", art: "~^~", spawnRate: 0.065 },
      { id: "wsk_mth_07", name: "Murmur", art: ".^.", spawnRate: 0.06 },
      { id: "wsk_mth_08", name: "Whisper", art: "\u2307~\u2307", spawnRate: 0.055 },
      { id: "wsk_mth_09", name: "Hiss", art: "\u223F\u223F\u223F", spawnRate: 0.05 },
      { id: "wsk_mth_10", name: "Croon", art: "\u03C9", spawnRate: 0.04 },
      { id: "wsk_mth_11", name: "Yowl", art: "\u223F^\u223F", spawnRate: 0.03 },
      { id: "wsk_mth_12", name: "Keen", art: "\u2307^\u2307", spawnRate: 0.025 },
      { id: "wsk_mth_13", name: "Wail", art: "\u21AF^\u21AF", spawnRate: 0.02 },
      { id: "wsk_mth_14", name: "Screech", art: "\u26A1^\u26A1", spawnRate: 0.015 },
      { id: "wsk_mth_15", name: "Shriek", art: "\u2727^\u2727", spawnRate: 0.01 },
      { id: "wsk_mth_16", name: "Banshee", art: "\u2726^\u2726", spawnRate: 5e-3 },
      { id: "wsk_mth_17", name: "Phantom", art: "\u2605^\u2605", spawnRate: 3e-3 }
    ],
    tail: [
      { id: "wsk_tal_01", name: "Swish", art: "~~\xAC", spawnRate: 0.12 },
      { id: "wsk_tal_02", name: "Curl", art: "~/", spawnRate: 0.11 },
      { id: "wsk_tal_03", name: "Flick", art: "/~", spawnRate: 0.1 },
      { id: "wsk_tal_04", name: "Sway", art: "~~", spawnRate: 0.09 },
      { id: "wsk_tal_05", name: "Drift", art: "~\xAC", spawnRate: 0.08 },
      { id: "wsk_tal_06", name: "Sweep", art: "\u2307~", spawnRate: 0.07 },
      { id: "wsk_tal_07", name: "Coil", art: "~\u2307", spawnRate: 0.06 },
      { id: "wsk_tal_08", name: "Whisk", art: "\u2307\u2307", spawnRate: 0.055 },
      { id: "wsk_tal_09", name: "Twist", art: "~\u2307~", spawnRate: 0.05 },
      { id: "wsk_tal_10", name: "Lash", art: "\u2307~\u2307", spawnRate: 0.04 },
      { id: "wsk_tal_11", name: "Snap", art: "\u21AF~", spawnRate: 0.03 },
      { id: "wsk_tal_12", name: "Phantom", art: "\u21AF\u21AF", spawnRate: 0.025 },
      { id: "wsk_tal_13", name: "Shadow", art: "\u2727~", spawnRate: 0.02 },
      { id: "wsk_tal_14", name: "Wisp", art: "\u2727\u2307\u2727", spawnRate: 0.01 },
      { id: "wsk_tal_15", name: "Ghost", art: "\u2604~\u2604", spawnRate: 7e-3 },
      { id: "wsk_tal_16", name: "Vanish", art: "\u2727\u21AF\u2727", spawnRate: 3e-3 }
    ]
  }
};

// config/species/pyrax.json
var pyrax_default = {
  id: "pyrax",
  name: "Pyrax",
  description: "A smoldering ember-bird, half-formed from living flame, always trailing sparks.",
  spawnWeight: 6,
  art: ["  /EE\\,", " ( MM  >", "  \\BB /~", "   TT"],
  zones: ["eyes", "mouth", "body", "tail"],
  traitPools: {
    eyes: [
      { id: "pyr_eye_01", name: "Flicker", art: "\xB7\xB7", spawnRate: 0.14 },
      { id: "pyr_eye_02", name: "Glow", art: "\xB0\xB0", spawnRate: 0.12 },
      { id: "pyr_eye_03", name: "Ember", art: "\u2022\u2022", spawnRate: 0.1 },
      { id: "pyr_eye_04", name: "Sear", art: "\xB7\xB0", spawnRate: 0.09 },
      { id: "pyr_eye_05", name: "Kindle", art: "\xB0\xB7", spawnRate: 0.08 },
      { id: "pyr_eye_06", name: "Smolder", art: "\u25E6\u25E6", spawnRate: 0.07 },
      { id: "pyr_eye_07", name: "Scorch", art: ">\xB7", spawnRate: 0.065 },
      { id: "pyr_eye_08", name: "Flare", art: "\u25D0\u25D0", spawnRate: 0.06 },
      { id: "pyr_eye_09", name: "Ignite", art: "\u25D1\u25D1", spawnRate: 0.05 },
      { id: "pyr_eye_10", name: "Blaze", art: "\u25CE\u25CE", spawnRate: 0.04 },
      { id: "pyr_eye_11", name: "Burn", art: "\u25CF\u25CF", spawnRate: 0.03 },
      { id: "pyr_eye_12", name: "Pyre", art: "\u25C7\u25C7", spawnRate: 0.025 },
      { id: "pyr_eye_13", name: "Forge", art: "\u25C8\u25C8", spawnRate: 0.02 },
      { id: "pyr_eye_14", name: "Furnace", art: "\u25C9\u25C9", spawnRate: 0.015 },
      { id: "pyr_eye_15", name: "Inferno", art: "\u2299\u2299", spawnRate: 0.01 },
      { id: "pyr_eye_16", name: "Nova", art: "\u2605\u2605", spawnRate: 5e-3 },
      { id: "pyr_eye_17", name: "Supernova", art: "\u2727\u2727", spawnRate: 3e-3 }
    ],
    mouth: [
      { id: "pyr_mth_01", name: "Crackle", art: "~~", spawnRate: 0.14 },
      { id: "pyr_mth_02", name: "Hiss", art: "^^", spawnRate: 0.12 },
      { id: "pyr_mth_03", name: "Pop", art: ".^", spawnRate: 0.1 },
      { id: "pyr_mth_04", name: "Snap", art: "_^", spawnRate: 0.09 },
      { id: "pyr_mth_05", name: "Sizzle", art: "^~", spawnRate: 0.08 },
      { id: "pyr_mth_06", name: "Sputter", art: "~^", spawnRate: 0.07 },
      { id: "pyr_mth_07", name: "Whoosh", art: "\u2307^", spawnRate: 0.06 },
      { id: "pyr_mth_08", name: "Roar", art: "\u223F~", spawnRate: 0.05 },
      { id: "pyr_mth_09", name: "Rage", art: "\u2307~", spawnRate: 0.04 },
      { id: "pyr_mth_10", name: "Snarl", art: "\u2248^", spawnRate: 0.03 },
      { id: "pyr_mth_11", name: "Scream", art: "\u21AF^", spawnRate: 0.025 },
      { id: "pyr_mth_12", name: "Bellow", art: "\u223F^", spawnRate: 0.02 },
      { id: "pyr_mth_13", name: "Blast", art: "\u26A1\xB7", spawnRate: 0.015 },
      { id: "pyr_mth_14", name: "Eruption", art: "\u26A1^", spawnRate: 0.01 },
      { id: "pyr_mth_15", name: "Hellfire", art: "\u2727^", spawnRate: 7e-3 },
      { id: "pyr_mth_16", name: "Inferno", art: "\u2726\xB7", spawnRate: 5e-3 },
      { id: "pyr_mth_17", name: "Cataclysm", art: "\u2605^", spawnRate: 3e-3 }
    ],
    body: [
      { id: "pyr_bod_01", name: "Ash", art: "\u2591\u2591", spawnRate: 0.14 },
      { id: "pyr_bod_02", name: "Soot", art: "\xB7\xB7", spawnRate: 0.12 },
      { id: "pyr_bod_03", name: "Char", art: "\u2219\u2219", spawnRate: 0.1 },
      { id: "pyr_bod_04", name: "Smoke", art: "::", spawnRate: 0.09 },
      { id: "pyr_bod_05", name: "Cinder", art: "--", spawnRate: 0.08 },
      { id: "pyr_bod_06", name: "Coal", art: "\u2307\u2307", spawnRate: 0.07 },
      { id: "pyr_bod_07", name: "Ember", art: "\u2592\u2592", spawnRate: 0.06 },
      { id: "pyr_bod_08", name: "Scald", art: "~~", spawnRate: 0.05 },
      { id: "pyr_bod_09", name: "Blister", art: "\u2248\u2248", spawnRate: 0.04 },
      { id: "pyr_bod_10", name: "Magma", art: "\u223F\u223F", spawnRate: 0.035 },
      { id: "pyr_bod_11", name: "Lava", art: "\u2593\u2593", spawnRate: 0.03 },
      { id: "pyr_bod_12", name: "Molten", art: "++", spawnRate: 0.025 },
      { id: "pyr_bod_13", name: "Forge", art: "##", spawnRate: 0.02 },
      { id: "pyr_bod_14", name: "Crucible", art: "\u25C6\u25C6", spawnRate: 0.015 },
      { id: "pyr_bod_15", name: "Core", art: "\u25C8\u25C8", spawnRate: 0.01 },
      { id: "pyr_bod_16", name: "Plasma", art: "\u2B21\u2B21", spawnRate: 5e-3 },
      { id: "pyr_bod_17", name: "Solar", art: "\u2605\u2605", spawnRate: 3e-3 }
    ],
    tail: [
      { id: "pyr_tal_01", name: "Wisp", art: "~/", spawnRate: 0.14 },
      { id: "pyr_tal_02", name: "Trail", art: "~~", spawnRate: 0.12 },
      { id: "pyr_tal_03", name: "Drift", art: "/~", spawnRate: 0.1 },
      { id: "pyr_tal_04", name: "Smoke", art: "\u2307/", spawnRate: 0.09 },
      { id: "pyr_tal_05", name: "Spark", art: "~\u2307", spawnRate: 0.08 },
      { id: "pyr_tal_06", name: "Cinder", art: "/\u2307", spawnRate: 0.07 },
      { id: "pyr_tal_07", name: "Ember", art: "\u2307~", spawnRate: 0.06 },
      { id: "pyr_tal_08", name: "Scorch", art: "~\u223F", spawnRate: 0.05 },
      { id: "pyr_tal_09", name: "Blaze", art: "\u2307\u2307", spawnRate: 0.04 },
      { id: "pyr_tal_10", name: "Flare", art: "\u223F\u223F", spawnRate: 0.03 },
      { id: "pyr_tal_11", name: "Torch", art: "\u21AF~", spawnRate: 0.025 },
      { id: "pyr_tal_12", name: "Burn", art: "\u21AF\u21AF", spawnRate: 0.02 },
      { id: "pyr_tal_13", name: "Pyre", art: "\u224B\u224B", spawnRate: 0.015 },
      { id: "pyr_tal_14", name: "Inferno", art: "\u26A1\u2307", spawnRate: 0.01 },
      { id: "pyr_tal_15", name: "Eruption", art: "\u2727\u2307", spawnRate: 7e-3 },
      { id: "pyr_tal_16", name: "Phoenix", art: "\u2727\u2727", spawnRate: 5e-3 },
      { id: "pyr_tal_17", name: "Eternal", art: "\u2604\u2604", spawnRate: 3e-3 }
    ]
  }
};

// src/config/species.ts
var SPECIES_DATA = [
  compi_default,
  flikk_default,
  glich_default,
  jinx_default,
  monu_default,
  whiski_default,
  pyrax_default
];
var _speciesCache = null;
var _speciesById = /* @__PURE__ */ new Map();
var _traitIndex = /* @__PURE__ */ new Map();
function ensureLoaded() {
  if (_speciesCache) return;
  _speciesCache = loadSpecies();
  _speciesById = /* @__PURE__ */ new Map();
  _traitIndex = /* @__PURE__ */ new Map();
  for (const species of _speciesCache) {
    _speciesById.set(species.id, species);
    const variantMap = /* @__PURE__ */ new Map();
    for (const slotId of Object.keys(species.traitPools)) {
      const traits = species.traitPools[slotId];
      if (traits) {
        for (const trait of traits) {
          variantMap.set(trait.id, trait);
        }
      }
    }
    _traitIndex.set(species.id, variantMap);
  }
}
function loadSpecies() {
  return SPECIES_DATA;
}
function getSpeciesById(id) {
  ensureLoaded();
  return _speciesById.get(id);
}
function pickSpecies(rng) {
  ensureLoaded();
  const species = _speciesCache;
  if (species.length === 0) {
    throw new Error("No species loaded");
  }
  const totalWeight = species.reduce((sum, s) => sum + s.spawnWeight, 0);
  let roll = rng() * totalWeight;
  for (const s of species) {
    roll -= s.spawnWeight;
    if (roll <= 0) return s;
  }
  return species[species.length - 1];
}
function pickTraitForSlot(species, slotId, rng) {
  const traits = species.traitPools[slotId];
  if (!traits || traits.length === 0) {
    throw new Error(`No traits for slot ${slotId} in species ${species.id}`);
  }
  const totalWeight = traits.reduce((sum, t) => sum + t.spawnRate, 0);
  let roll = rng() * totalWeight;
  for (const t of traits) {
    roll -= t.spawnRate;
    if (roll <= 0) return t;
  }
  return traits[traits.length - 1];
}
function getTraitDefinition(speciesId, variantId) {
  ensureLoaded();
  const variantMap = _traitIndex.get(speciesId);
  if (!variantMap) return void 0;
  return variantMap.get(variantId);
}

// config/traits.json
var traits_default = {
  raritySpawnWeights: {
    common: 0.3,
    uncommon: 0.25,
    rare: 0.2,
    epic: 0.13,
    legendary: 0.08,
    mythic: 0.04
  },
  slots: [
    {
      id: "eyes",
      variants: {
        common: [
          { id: "eye_c01", name: "Pebble Gaze", art: "\u25CB.\u25CB" },
          { id: "eye_c02", name: "Dash Sight", art: "-.\u2013" },
          { id: "eye_c03", name: "Pip Vision", art: "\xB7.\xB7" },
          { id: "eye_c04", name: "Round Look", art: "O.O" },
          { id: "eye_c05", name: "Bead Eyes", art: "\xB0.\xB0" }
        ],
        uncommon: [
          { id: "eye_u01", name: "Half Moon", art: "\u25D0.\u25D0" },
          { id: "eye_u02", name: "Crescent", art: "\u25D1_\u25D1" },
          { id: "eye_u03", name: "Owl Sight", art: "\u25CBw\u25CB" },
          { id: "eye_u04", name: "Slit Gaze", art: ">.>" }
        ],
        rare: [
          { id: "eye_r01", name: "Ring Gaze", art: "\u25CE.\u25CE" },
          { id: "eye_r02", name: "Dot Sight", art: "\u25CF_\u25CF" },
          { id: "eye_r03", name: "Core Eyes", art: "\u25C9w\u25C9" }
        ],
        epic: [
          { id: "eye_e01", name: "Gem Gaze", art: "\u25C6.\u25C6" },
          { id: "eye_e02", name: "Star Dust", art: "\u2756_\u2756" },
          { id: "eye_e03", name: "Spark Eyes", art: "\u2726w\u2726" }
        ],
        legendary: [
          { id: "eye_l01", name: "Star Sight", art: "\u2605w\u2605" },
          { id: "eye_l02", name: "Moon Eyes", art: "\u2606_\u2606" }
        ],
        mythic: [
          { id: "eye_m01", name: "Void Gaze", art: "\u2299_\u2299" },
          { id: "eye_m02", name: "Prism Eyes", art: "\u25C8_\u25C8" }
        ]
      }
    },
    {
      id: "mouth",
      variants: {
        common: [
          { id: "mth_c01", name: "Flat Line", art: " - " },
          { id: "mth_c02", name: "Wave", art: " ~ " },
          { id: "mth_c03", name: "Smile", art: " \u25E1 " },
          { id: "mth_c04", name: "Dot", art: " . " },
          { id: "mth_c05", name: "Underline", art: " _ " }
        ],
        uncommon: [
          { id: "mth_u01", name: "Circle", art: " \u2218 " },
          { id: "mth_u02", name: "Ripple", art: " \u2248 " },
          { id: "mth_u03", name: "Curve", art: " \u2312 " },
          { id: "mth_u04", name: "Whisker", art: " v " }
        ],
        rare: [
          { id: "mth_r01", name: "Omega", art: " \u03C9 " },
          { id: "mth_r02", name: "Swirl", art: " \u223F " },
          { id: "mth_r03", name: "Triangle", art: " \u25B3 " }
        ],
        epic: [
          { id: "mth_e01", name: "Prism", art: " \u2207 " },
          { id: "mth_e02", name: "Void", art: " \u2297 " },
          { id: "mth_e03", name: "Gem", art: " \u25C7 " }
        ],
        legendary: [
          { id: "mth_l01", name: "Diamond", art: " \u25C7 " },
          { id: "mth_l02", name: "Spark", art: " \u2726 " }
        ],
        mythic: [
          { id: "mth_m01", name: "Core", art: " \u2297 " },
          { id: "mth_m02", name: "Nova", art: " \u2726 " }
        ]
      }
    },
    {
      id: "body",
      variants: {
        common: [
          { id: "bod_c01", name: "Dots", art: " \u2591\u2591 " },
          { id: "bod_c02", name: "Light", art: " \xB7\xB7 " },
          { id: "bod_c03", name: "Plain", art: " -- " },
          { id: "bod_c04", name: "Thin", art: " :: " },
          { id: "bod_c05", name: "Faint", art: " \u2219\u2219 " }
        ],
        uncommon: [
          { id: "bod_u01", name: "Shade", art: " \u2592\u2592 " },
          { id: "bod_u02", name: "Mesh", art: " ## " },
          { id: "bod_u03", name: "Grain", art: " \u2591\u2592 " },
          { id: "bod_u04", name: "Cross", art: " ++ " }
        ],
        rare: [
          { id: "bod_r01", name: "Crystal", art: " \u2593\u2593 " },
          { id: "bod_r02", name: "Wave", art: " \u2248\u2248 " },
          { id: "bod_r03", name: "Pulse", art: " \u223F\u223F " }
        ],
        epic: [
          { id: "bod_e01", name: "Shell", art: " \u25C6\u25C6 " },
          { id: "bod_e02", name: "Core", art: " \u2299\u2299 " },
          { id: "bod_e03", name: "Facet", art: " \u25C8\u25C8 " }
        ],
        legendary: [
          { id: "bod_l01", name: "Hex", art: " \u2B21\u2B21 " },
          { id: "bod_l02", name: "Star", art: " \u2726\u2726 " }
        ],
        mythic: [
          { id: "bod_m01", name: "Prism", art: " \u25C8\u25C8 " },
          { id: "bod_m02", name: "Void", art: " \u2299\u2299 " }
        ]
      }
    },
    {
      id: "tail",
      variants: {
        common: [
          { id: "tal_c01", name: "Curl", art: "~~/" },
          { id: "tal_c02", name: "Swish", art: "\\~\\" },
          { id: "tal_c03", name: "Stub", art: "_v_" },
          { id: "tal_c04", name: "Droop", art: "___" },
          { id: "tal_c05", name: "Flick", art: "~/~" }
        ],
        uncommon: [
          { id: "tal_u01", name: "Zigzag", art: "\u2307\u2307" },
          { id: "tal_u02", name: "Drift", art: "\u223F\u223F" },
          { id: "tal_u03", name: "Whirl", art: "~~\u2307" },
          { id: "tal_u04", name: "Wag", art: "~\u2307~" }
        ],
        rare: [
          { id: "tal_r01", name: "Ripple", art: "\u224B\u224B" },
          { id: "tal_r02", name: "Bolt", art: "\u21AF\u21AF" },
          { id: "tal_r03", name: "Fork", art: "\\\u2307/" }
        ],
        epic: [
          { id: "tal_e01", name: "Lightning", art: "\\\u26A1/" },
          { id: "tal_e02", name: "Infinity", art: "\\\u221E/" },
          { id: "tal_e03", name: "Shimmer", art: "\u2727\u2727" }
        ],
        legendary: [
          { id: "tal_l01", name: "Comet", art: "\u2604\u2604" },
          { id: "tal_l02", name: "Glitter", art: "\\\u2727/" }
        ],
        mythic: [
          { id: "tal_m01", name: "Supernova", art: "\u2604\u2727\u2604" },
          { id: "tal_m02", name: "Eternal", art: "\\\u221E/" }
        ]
      }
    }
  ]
};

// config/names.json
var names_default = {
  names: [
    "Sparks",
    "Muddle",
    "Blinky",
    "Drift",
    "Fang",
    "Glint",
    "Wisp",
    "Chirp",
    "Flux",
    "Torque",
    "Vortex",
    "Shade",
    "Prism",
    "Lumina",
    "Aurion",
    "Solark",
    "Pyralis",
    "Nub",
    "Pebble",
    "Mote",
    "Ember",
    "Ripple",
    "Thorn",
    "Haze",
    "Flicker",
    "Rumble",
    "Sprout",
    "Frost",
    "Glimmer",
    "Sable",
    "Crux",
    "Nimbus",
    "Quill",
    "Dusk",
    "Zephyr",
    "Cobalt",
    "Onyx",
    "Ivory",
    "Opal",
    "Thistle",
    "Bramble",
    "Cinder",
    "Lotus",
    "Rune",
    "Echo",
    "Wren",
    "Pike",
    "Slate",
    "Basalt",
    "Coral"
  ]
};

// src/config/traits.ts
var _config = traits_default;
var _byId = null;
function ensureLoaded2() {
  if (_byId) return;
  _byId = /* @__PURE__ */ new Map();
  for (const slotRaw of _config.slots) {
    for (const variantList of Object.values(slotRaw.variants)) {
      for (const v of variantList) {
        _byId.set(v.id, { id: v.id, name: v.name, art: v.art });
      }
    }
  }
}
function getVariantById(id) {
  ensureLoaded2();
  return _byId.get(id);
}
function loadCreatureName(rng) {
  const names = names_default.names;
  return names[Math.floor(rng() * names.length)];
}

// src/engine/batch.ts
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function pickColor(rng) {
  const config3 = loadConfig();
  const weights = config3.colors;
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [color, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return color;
  }
  return entries[entries.length - 1][0];
}
function pickBatchSize(rng) {
  const roll = rng();
  if (roll < 0.4) return 3;
  if (roll < 0.8) return 4;
  return 5;
}
function generateCreatureSlots(speciesId, rng) {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`Unknown species: ${speciesId}`);
  const speciesSlots = Object.keys(species.traitPools);
  return speciesSlots.map((slotId) => {
    const trait = pickTraitForSlot(species, slotId, rng);
    const color = pickColor(rng);
    return { slotId, variantId: trait.id, color };
  });
}
function spawnBatch(state2, now, rng) {
  if (state2.batch !== null && state2.batch.attemptsRemaining > 0) {
    return [];
  }
  const batchSize = pickBatchSize(rng);
  const spawned = [];
  for (let i = 0; i < batchSize; i++) {
    const species = pickSpecies(rng);
    const creature = {
      id: generateId(),
      speciesId: species.id,
      name: loadCreatureName(rng),
      slots: generateCreatureSlots(species.id, rng),
      spawnedAt: now
    };
    spawned.push(creature);
  }
  state2.nearby = spawned;
  state2.batch = {
    attemptsRemaining: SHARED_ATTEMPTS,
    failPenalty: 0,
    spawnedAt: now
  };
  return spawned;
}
function cleanupBatch(state2, now) {
  if (state2.batch === null) {
    return [];
  }
  const elapsed = now - state2.batch.spawnedAt;
  const timedOut = elapsed > BATCH_LINGER_MS;
  const noAttemptsLeft = state2.batch.attemptsRemaining === 0;
  if (timedOut || noAttemptsLeft) {
    const despawnedIds = state2.nearby.map((c) => c.id);
    state2.nearby = [];
    state2.batch = null;
    return despawnedIds;
  }
  return [];
}

// src/engine/energy.ts
var config2 = loadConfig();
var ENERGY_GAIN_INTERVAL_MS = config2.energy.gainIntervalMs;
var MAX_ENERGY = config2.energy.maxEnergy;
function processEnergyGain(state2, now) {
  const elapsed = now - state2.lastEnergyGainAt;
  const intervals = Math.floor(elapsed / ENERGY_GAIN_INTERVAL_MS);
  if (intervals <= 0) return 0;
  const maxGain = MAX_ENERGY - state2.energy;
  const gained = Math.min(intervals, maxGain);
  state2.energy += gained;
  state2.lastEnergyGainAt += intervals * ENERGY_GAIN_INTERVAL_MS;
  return gained;
}
function spendEnergy(state2, amount) {
  if (state2.energy < amount) {
    throw new Error(`Not enough energy: have ${state2.energy}, need ${amount}`);
  }
  state2.energy -= amount;
}
var SESSION_ENERGY_BONUS = config2.energy.sessionBonus;
function processSessionEnergyBonus(state2, sessionId) {
  if (!sessionId || state2.currentSessionId === sessionId) {
    return 0;
  }
  state2.currentSessionId = sessionId;
  state2.sessionUpgradeCount = 0;
  const maxGain = MAX_ENERGY - state2.energy;
  const gained = Math.min(SESSION_ENERGY_BONUS, maxGain);
  state2.energy += gained;
  return gained;
}

// src/engine/catch.ts
function calculateCatchRate(speciesId, slots, failPenalty) {
  const config3 = loadConfig();
  const { baseCatchRate, minCatchRate, maxCatchRate, maxTraitSpawnRate, difficultyScale } = config3.catching;
  let rarestRate = maxTraitSpawnRate;
  for (const slot of slots) {
    const trait = getTraitDefinition(speciesId, slot.variantId);
    if (trait && trait.spawnRate < rarestRate) {
      rarestRate = trait.spawnRate;
    }
  }
  const rate = baseCatchRate - difficultyScale * (1 - rarestRate / maxTraitSpawnRate) - failPenalty;
  return Math.max(minCatchRate, Math.min(maxCatchRate, rate));
}
function calculateXpEarned(speciesId, slots) {
  const config3 = loadConfig();
  let rareCount = 0;
  for (const slot of slots) {
    const trait = getTraitDefinition(speciesId, slot.variantId);
    if (trait && trait.spawnRate < 0.05) rareCount++;
  }
  return config3.catching.xpBase + rareCount * config3.catching.xpRarityMultiplier;
}
function calculateEnergyCost(speciesId, slots) {
  let rareCount = 0;
  for (const slot of slots) {
    const trait = getTraitDefinition(speciesId, slot.variantId);
    if (trait && trait.spawnRate < 0.05) rareCount++;
  }
  return Math.min(1 + rareCount, 5);
}
function attemptCatch(state2, nearbyIndex, rng = Math.random) {
  const config3 = loadConfig();
  if (!state2.batch) {
    throw new Error("No active batch");
  }
  if (state2.batch.attemptsRemaining <= 0) {
    throw new Error("No attempts remaining");
  }
  if (nearbyIndex < 0 || nearbyIndex >= state2.nearby.length) {
    throw new Error("Invalid creature index");
  }
  const nearby = state2.nearby[nearbyIndex];
  const energyCost = calculateEnergyCost(nearby.speciesId, nearby.slots);
  if (state2.energy < energyCost) {
    throw new Error(`Not enough energy: have ${state2.energy}, need ${energyCost}`);
  }
  spendEnergy(state2, energyCost);
  state2.batch.attemptsRemaining--;
  const catchRate = calculateCatchRate(nearby.speciesId, nearby.slots, state2.batch.failPenalty);
  const roll = rng();
  const success = roll < catchRate;
  let xpEarned = 0;
  if (success) {
    state2.nearby.splice(nearbyIndex, 1);
    xpEarned = calculateXpEarned(nearby.speciesId, nearby.slots);
    const collectionCreature = {
      id: nearby.id,
      speciesId: nearby.speciesId,
      name: nearby.name,
      slots: nearby.slots,
      caughtAt: Date.now(),
      generation: 0,
      archived: false
    };
    state2.collection.push(collectionCreature);
    state2.profile.xp += xpEarned;
    state2.profile.totalCatches++;
  } else {
    state2.batch.failPenalty += config3.catching.failPenaltyPerMiss;
  }
  return {
    success,
    creature: nearby,
    energySpent: energyCost,
    fled: false,
    xpEarned,
    attemptsRemaining: state2.batch.attemptsRemaining,
    failPenalty: state2.batch.failPenalty
  };
}

// src/types.ts
var SLOT_IDS = ["eyes", "mouth", "body", "tail"];
var MAX_COLLECTION_SIZE = 15;

// src/engine/gold.ts
function earnGold(state2, amount) {
  if (amount < 0) throw new Error("Cannot earn negative gold");
  state2.gold += amount;
}
function spendGold(state2, amount) {
  if (state2.gold < amount) throw new Error(`Not enough gold: have ${state2.gold}, need ${amount}`);
  state2.gold -= amount;
}

// src/engine/progression.ts
function getXpForNextLevel(level) {
  const config3 = loadConfig();
  const thresholds = config3.leveling.thresholds;
  const index = Math.min(level - 1, thresholds.length - 1);
  return thresholds[index];
}
function grantXp(state2, amount) {
  state2.profile.xp += amount;
  const oldLevel = state2.profile.level;
  let currentLevel = oldLevel;
  while (true) {
    const needed = getXpForNextLevel(currentLevel);
    if (state2.profile.xp >= needed) {
      state2.profile.xp -= needed;
      currentLevel++;
    } else {
      break;
    }
  }
  if (currentLevel > oldLevel) {
    state2.profile.level = currentLevel;
    return {
      oldLevel,
      newLevel: currentLevel,
      xpOverflow: state2.profile.xp
    };
  }
  return null;
}

// src/engine/breed.ts
function generateId2() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function traitPassChance(spawnRate) {
  const cfg = loadConfig().breed;
  const raw = cfg.inheritanceBase + (cfg.referenceSpawnRate - spawnRate) * cfg.inheritanceRarityScale;
  return Math.max(cfg.inheritanceMin, Math.min(cfg.inheritanceMax, raw));
}
function calculateInheritance(speciesId, variantIdA, variantIdB) {
  if (variantIdA === variantIdB) {
    return { chanceA: 1, chanceB: 0 };
  }
  const traitA = getTraitDefinition(speciesId, variantIdA);
  const traitB = getTraitDefinition(speciesId, variantIdB);
  if (!traitA || !traitB) {
    throw new Error(
      `Trait not found: ${!traitA ? variantIdA : variantIdB} for species ${speciesId}`
    );
  }
  const rawA = traitPassChance(traitA.spawnRate);
  const rawB = traitPassChance(traitB.spawnRate);
  const total = rawA + rawB;
  return {
    chanceA: rawA / total,
    chanceB: rawB / total
  };
}
function calculateBreedCost(speciesId, parentA, parentB) {
  const energyCfg = loadConfig().energy;
  const base = energyCfg.baseMergeCost;
  const max = energyCfg.maxMergeCost;
  const threshold = energyCfg.rareThreashold;
  let rareCount = 0;
  for (const parent of [parentA, parentB]) {
    for (const slot of parent.slots) {
      const trait = getTraitDefinition(speciesId, slot.variantId);
      if (trait && trait.spawnRate < threshold) {
        rareCount++;
      }
    }
  }
  return Math.min(base + rareCount, max);
}
function validateBreedPair(state2, parentAId, parentBId) {
  if (parentAId === parentBId) {
    throw new Error("Cannot breed a creature with itself.");
  }
  const parentA = state2.collection.find((c) => c.id === parentAId);
  const parentB = state2.collection.find((c) => c.id === parentBId);
  if (!parentA) throw new Error(`Creature not found: ${parentAId}`);
  if (!parentB) throw new Error(`Creature not found: ${parentBId}`);
  if (parentA.archived) throw new Error(`Creature is archived: ${parentAId}`);
  if (parentB.archived) throw new Error(`Creature is archived: ${parentBId}`);
  if (parentA.speciesId !== parentB.speciesId) {
    throw new Error(
      `Cannot breed different species: ${parentA.speciesId} and ${parentB.speciesId}`
    );
  }
  return { parentA, parentB };
}
function buildSlotInheritance(speciesId, parentA, parentB) {
  const species = getSpeciesById(speciesId);
  const speciesSlots = species ? Object.keys(species.traitPools) : SLOT_IDS;
  return speciesSlots.map((slotId) => {
    const slotA = parentA.slots.find((s) => s.slotId === slotId);
    const slotB = parentB.slots.find((s) => s.slotId === slotId);
    if (!slotA || !slotB) {
      throw new Error(`Missing slot ${slotId} on parent`);
    }
    const traitA = getTraitDefinition(speciesId, slotA.variantId);
    const traitB = getTraitDefinition(speciesId, slotB.variantId);
    if (!traitA || !traitB) {
      throw new Error(
        `Trait definition not found for slot ${slotId}`
      );
    }
    const { chanceA, chanceB } = calculateInheritance(
      speciesId,
      slotA.variantId,
      slotB.variantId
    );
    return {
      slotId,
      parentAVariant: traitA,
      parentBVariant: traitB,
      parentAChance: chanceA,
      parentBChance: chanceB
    };
  });
}
function previewBreed(state2, parentAId, parentBId) {
  const { parentA, parentB } = validateBreedPair(state2, parentAId, parentBId);
  const speciesId = parentA.speciesId;
  const slotInheritance = buildSlotInheritance(speciesId, parentA, parentB);
  const energyCost = calculateBreedCost(speciesId, parentA, parentB);
  const parentAIndex = state2.collection.indexOf(parentA) + 1;
  const parentBIndex = state2.collection.indexOf(parentB) + 1;
  return { parentA, parentB, parentAIndex, parentBIndex, slotInheritance, energyCost };
}
function executeBreed(state2, parentAId, parentBId, rng = Math.random) {
  const { parentA, parentB } = validateBreedPair(state2, parentAId, parentBId);
  const speciesId = parentA.speciesId;
  const slotInheritance = buildSlotInheritance(speciesId, parentA, parentB);
  const energyCost = calculateBreedCost(speciesId, parentA, parentB);
  if (state2.energy < energyCost) {
    throw new Error(
      `Not enough energy: have ${state2.energy}, need ${energyCost}`
    );
  }
  const childSlots = [];
  const inheritedFrom = {};
  for (const si of slotInheritance) {
    const roll = rng();
    const fromA = roll < si.parentAChance;
    const chosenVariant = fromA ? si.parentAVariant : si.parentBVariant;
    const parentSlot = fromA ? parentA.slots.find((s) => s.slotId === si.slotId) : parentB.slots.find((s) => s.slotId === si.slotId);
    childSlots.push({
      slotId: si.slotId,
      variantId: chosenVariant.id,
      color: parentSlot.color
    });
    inheritedFrom[si.slotId] = fromA ? "A" : "B";
  }
  const config3 = loadConfig();
  const childRanks = childSlots.map((s) => {
    const m = s.variantId.match(/_r(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const childAvgRank = childRanks.reduce((a, b) => a + b, 0) / childRanks.length;
  const goldCost = config3.mergeGold.baseCost + Math.floor(childAvgRank * config3.mergeGold.rankMultiplier);
  spendGold(state2, goldCost);
  const upgradeIndex = Math.floor(rng() * childSlots.length);
  const upgradeSlot = childSlots[upgradeIndex];
  const upgradeRankMatch = upgradeSlot.variantId.match(/_r(\d+)$/);
  if (upgradeRankMatch) {
    const currentRank = parseInt(upgradeRankMatch[1], 10);
    upgradeSlot.variantId = upgradeSlot.variantId.replace(
      /_r\d+$/,
      `_r${currentRank + 1}`
    );
  }
  if (rng() < config3.mergeGold.downgradeChance && childSlots.length > 1) {
    const otherIndices = childSlots.map((_, i) => i).filter((i) => i !== upgradeIndex);
    const pick = Math.floor(rng() * otherIndices.length);
    const downgradeIndex = otherIndices[pick];
    const downgradeSlot = childSlots[downgradeIndex];
    const downgradeRankMatch = downgradeSlot.variantId.match(/_r(\d+)$/);
    if (downgradeRankMatch) {
      const currentRank = parseInt(downgradeRankMatch[1], 10);
      if (currentRank > 0) {
        downgradeSlot.variantId = downgradeSlot.variantId.replace(
          /_r\d+$/,
          `_r${currentRank - 1}`
        );
      }
    }
  }
  const child = {
    id: generateId2(),
    speciesId,
    name: parentA.name,
    slots: childSlots,
    caughtAt: Date.now(),
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    mergedFrom: [parentAId, parentBId],
    archived: false
  };
  state2.collection = state2.collection.filter(
    (c) => c.id !== parentAId && c.id !== parentBId
  );
  state2.collection.push(child);
  state2.energy -= energyCost;
  state2.profile.totalMerges += 1;
  grantXp(state2, config3.leveling.xpPerMerge);
  return {
    child,
    parentA,
    parentB,
    inheritedFrom
  };
}
function buildBreedTable(state2) {
  const speciesOrder = [];
  const bySpecies = /* @__PURE__ */ new Map();
  const silhouetteBy = /* @__PURE__ */ new Map();
  for (let i = 0; i < state2.collection.length; i++) {
    const creature = state2.collection[i];
    if (creature.archived) continue;
    if (!bySpecies.has(creature.speciesId)) {
      bySpecies.set(creature.speciesId, []);
      speciesOrder.push(creature.speciesId);
      silhouetteBy.set(creature.speciesId, creature.slots);
    }
    bySpecies.get(creature.speciesId).push({
      creatureIndex: i + 1,
      creature
    });
  }
  const species = [];
  for (const speciesId of speciesOrder) {
    const rows = bySpecies.get(speciesId);
    if (rows.length < 2) continue;
    species.push({
      speciesId,
      silhouette: silhouetteBy.get(speciesId),
      rows
    });
  }
  return { species };
}

// src/engine/archive.ts
function archiveCreature(state2, creatureId) {
  const index = state2.collection.findIndex((c) => c.id === creatureId);
  if (index === -1) {
    throw new Error(`Creature not found in collection: ${creatureId}`);
  }
  const creature = state2.collection[index];
  if (creature.archived) {
    throw new Error(`Creature is already archived: ${creatureId}`);
  }
  state2.collection.splice(index, 1);
  creature.archived = true;
  state2.archive.push(creature);
  return { creature };
}
function releaseCreature(state2, creatureId) {
  const index = state2.collection.findIndex((c) => c.id === creatureId);
  if (index === -1) {
    throw new Error(`Creature not found in collection: ${creatureId}`);
  }
  state2.collection.splice(index, 1);
}
function isCollectionFull(state2) {
  return state2.collection.length >= MAX_COLLECTION_SIZE;
}

// src/engine/upgrade.ts
function performUpgrade(state2, creatureId, slotId) {
  const config3 = loadConfig();
  if (state2.sessionUpgradeCount >= config3.upgrade.sessionCap) {
    throw new Error(
      `Session upgrade cap reached (${config3.upgrade.sessionCap} per session)`
    );
  }
  const creature = state2.collection.find((c) => c.id === creatureId);
  if (!creature) {
    throw new Error(`Creature not found: ${creatureId}`);
  }
  if (creature.archived) {
    throw new Error(`Creature is archived: ${creatureId}`);
  }
  const slot = creature.slots.find((s) => s.slotId === slotId);
  if (!slot) {
    throw new Error(`Slot not found on creature: ${slotId}`);
  }
  const rankMatch = slot.variantId.match(/_r(\d+)$/);
  const currentRank = rankMatch ? parseInt(rankMatch[1], 10) : 0;
  if (currentRank >= config3.upgrade.maxRank) {
    throw new Error(
      `Trait ${slotId} is already at max rank (${config3.upgrade.maxRank})`
    );
  }
  const cost = config3.upgrade.costs[currentRank];
  spendGold(state2, cost);
  const newRank = currentRank + 1;
  slot.variantId = slot.variantId.replace(/_r\d+$/, `_r${newRank}`);
  state2.sessionUpgradeCount++;
  state2.profile.totalUpgrades++;
  grantXp(state2, config3.leveling.xpPerUpgrade);
  return {
    creatureId,
    slotId,
    fromRank: currentRank,
    toRank: newRank,
    goldCost: cost
  };
}

// src/engine/quest.ts
function generateQuestId() {
  return "q_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function calculateTeamPower(state2, creatureIds) {
  let total = 0;
  for (const id of creatureIds) {
    const creature = state2.collection.find((c) => c.id === id);
    if (!creature) continue;
    for (const slot of creature.slots) {
      const rankMatch = slot.variantId.match(/_r(\d+)$/);
      total += rankMatch ? parseInt(rankMatch[1], 10) : 0;
    }
  }
  return total;
}
function calculateQuestReward(teamPower) {
  const config3 = loadConfig();
  return Math.max(
    config3.quest.rewardFloor,
    Math.floor(teamPower * config3.quest.rewardMultiplier)
  );
}
function startQuest(state2, creatureIds) {
  const config3 = loadConfig();
  if (state2.activeQuest) {
    throw new Error("Already on a quest. Wait for the current quest to complete.");
  }
  if (creatureIds.length === 0) {
    throw new Error("Must send at least 1 creature on a quest.");
  }
  if (creatureIds.length > config3.quest.maxTeamSize) {
    throw new Error(
      `Max team size is ${config3.quest.maxTeamSize}, got ${creatureIds.length}`
    );
  }
  for (const id of creatureIds) {
    const creature = state2.collection.find((c) => c.id === id);
    if (!creature) {
      throw new Error(`Creature not found: ${id}`);
    }
    if (creature.archived) {
      throw new Error(`Creature is archived and cannot quest: ${id}`);
    }
  }
  const teamPower = calculateTeamPower(state2, creatureIds);
  const quest = {
    id: generateQuestId(),
    creatureIds: [...creatureIds],
    startedAtSession: 0,
    // will be tracked by session ID
    sessionsRemaining: config3.quest.lockDurationSessions,
    teamPower
  };
  state2.activeQuest = quest;
  return {
    quest,
    creaturesLocked: [...creatureIds]
  };
}
function checkQuest(state2) {
  if (!state2.activeQuest) {
    return null;
  }
  state2.activeQuest.sessionsRemaining--;
  if (state2.activeQuest.sessionsRemaining > 0) {
    return null;
  }
  const config3 = loadConfig();
  const quest = state2.activeQuest;
  const goldReward = calculateQuestReward(quest.teamPower);
  earnGold(state2, goldReward);
  grantXp(state2, config3.leveling.xpPerQuest);
  state2.profile.totalQuests++;
  state2.activeQuest = null;
  return {
    questId: quest.id,
    goldEarned: goldReward,
    xpEarned: config3.leveling.xpPerQuest,
    creaturesReturned: [...quest.creatureIds]
  };
}

// src/engine/discovery.ts
function recordDiscovery(state2, speciesId) {
  const config3 = loadConfig();
  if (state2.discoveredSpecies.includes(speciesId)) {
    return {
      speciesId,
      isNew: false,
      bonusXp: 0,
      totalDiscovered: state2.discoveredSpecies.length
    };
  }
  state2.discoveredSpecies.push(speciesId);
  const bonusXp = config3.leveling.xpDiscoveryBonus;
  grantXp(state2, bonusXp);
  return {
    speciesId,
    isNew: true,
    bonusXp,
    totalDiscovered: state2.discoveredSpecies.length
  };
}

// src/engine/advisor.ts
var TIER_BOUNDARIES = [0, 5, 9, 12, 15, 17];
var TIER_NAMES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
var POWER_MILESTONES = [25, 50, 100, 150, 200, 300, 500];
function extractRank(variantId) {
  const m = variantId.match(/_r(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}
function getTierName(rank) {
  for (let i = TIER_BOUNDARIES.length - 1; i >= 0; i--) {
    if (rank >= TIER_BOUNDARIES[i]) return TIER_NAMES[i];
  }
  return "common";
}
function getNextTierBoundary(rank) {
  for (const boundary of TIER_BOUNDARIES) {
    if (boundary > rank) return boundary;
  }
  return null;
}
function calculateTeamPower2(state2) {
  let total = 0;
  const questCreatureIds = state2.activeQuest?.creatureIds ?? [];
  for (const creature of state2.collection) {
    if (creature.archived) continue;
    if (questCreatureIds.includes(creature.id)) continue;
    for (const slot of creature.slots) {
      total += extractRank(slot.variantId);
    }
  }
  return total;
}
function getProgressInfo(state2) {
  const config3 = loadConfig();
  const xpToNextLevel = getXpForNextLevel(state2.profile.level);
  const xpPercent = xpToNextLevel > 0 ? Math.round(state2.profile.xp / xpToNextLevel * 100) : 100;
  let bestTrait = null;
  let bestRank = -1;
  for (const creature of state2.collection) {
    if (creature.archived) continue;
    for (const slot of creature.slots) {
      const rank = extractRank(slot.variantId);
      if (rank > bestRank) {
        bestRank = rank;
        bestTrait = {
          creatureName: creature.name,
          slot: slot.slotId,
          rank,
          tierName: getTierName(rank)
        };
      }
    }
  }
  let nearestTierThreshold = null;
  let minDistance = Infinity;
  for (const creature of state2.collection) {
    if (creature.archived) continue;
    for (const slot of creature.slots) {
      const rank = extractRank(slot.variantId);
      const nextBoundary = getNextTierBoundary(rank);
      if (nextBoundary !== null) {
        const distance = nextBoundary - rank;
        if (distance < minDistance) {
          minDistance = distance;
          nearestTierThreshold = {
            creatureName: creature.name,
            slot: slot.slotId,
            currentRank: rank,
            targetRank: nextBoundary,
            method: distance === 1 ? "upgrade" : "merge"
          };
        }
      }
    }
  }
  const teamPower = calculateTeamPower2(state2);
  let nextPowerMilestone = POWER_MILESTONES[POWER_MILESTONES.length - 1];
  for (const milestone of POWER_MILESTONES) {
    if (milestone > teamPower) {
      nextPowerMilestone = milestone;
      break;
    }
  }
  let nextSpeciesUnlock = null;
  const unlockLevels = config3.discovery?.speciesUnlockLevels ?? {};
  let closestUnlockLevel = Infinity;
  for (const [species, unlockLevel] of Object.entries(unlockLevels)) {
    const lvl = unlockLevel;
    if (lvl > state2.profile.level && lvl < closestUnlockLevel) {
      closestUnlockLevel = lvl;
      nextSpeciesUnlock = { species, level: lvl };
    }
  }
  const allSpecies = /* @__PURE__ */ new Set([
    ...state2.discoveredSpecies,
    ...Object.keys(unlockLevels)
  ]);
  const totalSpecies = Math.max(allSpecies.size, state2.discoveredSpecies.length);
  return {
    level: state2.profile.level,
    xp: state2.profile.xp,
    xpToNextLevel,
    xpPercent,
    nextSpeciesUnlock,
    bestTrait,
    nearestTierThreshold,
    teamPower,
    nextPowerMilestone,
    collectionSize: state2.collection.filter((c) => !c.archived).length,
    collectionMax: MAX_COLLECTION_SIZE,
    gold: state2.gold,
    energy: state2.energy,
    energyMax: MAX_ENERGY,
    discoveredCount: state2.discoveredSpecies.length,
    totalSpecies
  };
}
function getViableActions(state2) {
  const config3 = loadConfig();
  const actions = [];
  const questCreatureIds = state2.activeQuest?.creatureIds ?? [];
  if (state2.nearby.length > 0 && state2.batch && state2.batch.attemptsRemaining > 0) {
    for (let i = 0; i < state2.nearby.length; i++) {
      const creature = state2.nearby[i];
      const energyCost = 1;
      if (state2.energy >= energyCost) {
        actions.push({
          type: "catch",
          label: `Catch ${creature.name} (#${i + 1})`,
          cost: { energy: energyCost },
          priority: 0,
          reasoning: `Wild ${creature.speciesId} available`,
          target: { nearbyIndex: i }
        });
      }
    }
  }
  if (state2.sessionUpgradeCount < config3.upgrade.sessionCap) {
    for (let ci = 0; ci < state2.collection.length; ci++) {
      const creature = state2.collection[ci];
      if (creature.archived) continue;
      if (questCreatureIds.includes(creature.id)) continue;
      for (const slot of creature.slots) {
        const rank = extractRank(slot.variantId);
        if (rank >= config3.upgrade.maxRank) continue;
        const cost = config3.upgrade.costs[rank];
        if (state2.gold < cost) continue;
        const nextBoundary = getNextTierBoundary(rank);
        const nearTier = nextBoundary !== null && nextBoundary - rank === 1;
        actions.push({
          type: "upgrade",
          label: `Upgrade ${creature.name}'s ${slot.slotId} (rank ${rank} -> ${rank + 1})`,
          cost: { gold: cost },
          priority: 0,
          reasoning: nearTier ? `Pushes ${slot.slotId} into ${getTierName(rank + 1)} tier` : `Increases ${slot.slotId} rank`,
          target: { creatureIndex: ci + 1, slotId: slot.slotId }
        });
      }
    }
  }
  const speciesGroups = {};
  for (let ci = 0; ci < state2.collection.length; ci++) {
    const creature = state2.collection[ci];
    if (creature.archived) continue;
    if (questCreatureIds.includes(creature.id)) continue;
    if (!speciesGroups[creature.speciesId]) speciesGroups[creature.speciesId] = [];
    speciesGroups[creature.speciesId].push(ci);
  }
  for (const [speciesId, indexes] of Object.entries(speciesGroups)) {
    if (indexes.length < 2) continue;
    const sorted = [...indexes].sort((a, b) => {
      const powerA = state2.collection[a].slots.reduce((s, sl) => s + extractRank(sl.variantId), 0);
      const powerB = state2.collection[b].slots.reduce((s, sl) => s + extractRank(sl.variantId), 0);
      return powerB - powerA;
    });
    const ai = sorted[0];
    const bi = sorted[1];
    const avgRank = state2.collection[ai].slots.reduce((s, sl) => s + extractRank(sl.variantId), 0) / 4;
    const goldCost = config3.mergeGold.baseCost + Math.floor(avgRank * config3.mergeGold.rankMultiplier);
    if (state2.gold >= goldCost && state2.energy >= config3.energy.baseMergeCost) {
      actions.push({
        type: "merge",
        label: `Merge ${state2.collection[ai].name} + ${state2.collection[bi].name}`,
        cost: { gold: goldCost, energy: config3.energy.baseMergeCost },
        priority: 0,
        reasoning: `${indexes.length} ${speciesId} available for merge`,
        target: { creatureIndex: ai + 1, partnerIndex: bi + 1 }
      });
    }
  }
  if (!state2.activeQuest) {
    const availableCreatures = state2.collection.filter(
      (c) => !c.archived && !questCreatureIds.includes(c.id)
    );
    if (availableCreatures.length > 0) {
      const teamSize = Math.min(availableCreatures.length, config3.quest.maxTeamSize);
      actions.push({
        type: "quest",
        label: `Send ${teamSize} creature${teamSize > 1 ? "s" : ""} on a quest`,
        cost: {},
        priority: 0,
        reasoning: "Earn gold while you wait"
      });
    }
  }
  if (state2.nearby.length === 0 || !state2.batch) {
    actions.push({
      type: "scan",
      label: "Scan for new creatures",
      cost: {},
      priority: 0,
      reasoning: state2.nearby.length === 0 ? "No creatures nearby -- scan to find some" : "Check for new spawns"
    });
  }
  if (state2.collection.filter((c) => !c.archived).length >= MAX_COLLECTION_SIZE) {
    actions.push({
      type: "release",
      label: "Release or archive a creature to make room",
      cost: {},
      priority: 0,
      reasoning: "Collection is full (15/15)"
    });
  }
  actions.push({
    type: "collection",
    label: "View collection",
    cost: {},
    priority: 0,
    reasoning: "Review your creatures"
  });
  return actions;
}
function getAdvisorMode(action, result, state2) {
  if (action === "quest_complete") return "autopilot";
  if (action === "catch") {
    const catchResult = result;
    if (catchResult.success) {
      const speciesId = catchResult.creature.speciesId;
      if (!state2.discoveredSpecies.includes(speciesId)) {
        return "advisor";
      }
      const sameSpeciesCount = state2.collection.filter(
        (c) => c.speciesId === speciesId && !c.archived
      ).length;
      if (sameSpeciesCount >= 2) return "advisor";
    }
  }
  if (action === "upgrade") {
    const upgradeResult = result;
    const creature = state2.collection.find((c) => c.id === upgradeResult.creatureId);
    if (creature) {
      for (const slot of creature.slots) {
        const rank = extractRank(slot.variantId);
        const nextBoundary = getNextTierBoundary(rank);
        if (nextBoundary !== null && nextBoundary - rank === 1) return "advisor";
      }
    }
  }
  if (action === "merge" || action === "breed") return "advisor";
  if (state2.energy <= 2) {
    return "advisor";
  }
  if (state2.collection.filter((c) => !c.archived).length >= MAX_COLLECTION_SIZE) {
    return "advisor";
  }
  if (action === "level_up") return "advisor";
  return "autopilot";
}
function getSuggestedActions(action, result, state2) {
  const viable = getViableActions(state2);
  if (viable.length === 0) return [];
  for (const a of viable) {
    a.priority = scoreAction(a, action, result, state2);
  }
  viable.sort((a, b) => a.priority - b.priority);
  const collectionAction = viable.find((a) => a.type === "collection");
  const nonCollection = viable.filter((a) => a.type !== "collection");
  const top = nonCollection.slice(0, 4);
  if (collectionAction) top.push(collectionAction);
  top.forEach((a, i) => {
    a.priority = i + 1;
  });
  return top;
}
function scoreAction(action, lastAction, lastResult, state2) {
  let score = 50;
  if (action.type === "merge") score = 5;
  if (action.type === "upgrade") {
    score = 30;
    if (action.target?.slotId) {
      const creature = state2.collection[(action.target.creatureIndex ?? 1) - 1];
      if (creature) {
        const slot = creature.slots.find((s) => s.slotId === action.target.slotId);
        if (slot) {
          const rank = extractRank(slot.variantId);
          const nextBoundary = getNextTierBoundary(rank);
          if (nextBoundary !== null && nextBoundary - rank === 1) score = 8;
        }
      }
    }
  }
  if (action.type === "catch" && lastAction === "scan") score = 5;
  if (action.type === "catch" && lastAction === "catch") score = 15;
  if (action.type === "quest") {
    score = 35;
    if (state2.energy <= 3) score = 12;
  }
  if (action.type === "scan") score = 40;
  if (action.type === "release") score = 3;
  if (action.type === "collection") score = 100;
  return score;
}
function buildAdvisorContext(action, result, state2) {
  return {
    mode: getAdvisorMode(action, result, state2),
    suggestedActions: getSuggestedActions(action, result, state2),
    progress: getProgressInfo(state2)
  };
}

// src/engine/game-engine.ts
var GameEngine = class {
  state;
  constructor(state2) {
    this.state = state2;
  }
  processTick(tick, rng = Math.random) {
    const notifications = [];
    processNewTick(this.state, tick);
    const sessionId = tick.sessionId ?? String(tick.timestamp);
    const isNewSession = this.state.currentSessionId !== sessionId;
    processSessionEnergyBonus(this.state, sessionId);
    const energyGained = processEnergyGain(this.state, tick.timestamp);
    const despawned = cleanupBatch(this.state, tick.timestamp);
    if (this.state.activeQuest && isNewSession) {
      const questResult = checkQuest(this.state);
      if (questResult) {
        notifications.push({
          message: `Quest complete! Earned ${questResult.goldEarned} gold.`,
          level: "moderate"
        });
      }
    }
    let spawned = false;
    const timeSinceLastSpawn = tick.timestamp - this.state.lastSpawnAt;
    if (!this.state.batch && timeSinceLastSpawn >= SPAWN_INTERVAL_MS) {
      const creatures = spawnBatch(this.state, tick.timestamp, rng);
      if (creatures.length > 0) {
        spawned = true;
        this.state.lastSpawnAt = tick.timestamp;
        notifications.push({ message: `${creatures.length} creatures appeared nearby!`, level: "moderate" });
      }
    }
    return { notifications, spawned, energyGained, despawned };
  }
  scan(rng = Math.random) {
    if (this.state.nearby.length === 0) {
      spawnBatch(this.state, Date.now(), rng);
    }
    const nearby = this.state.nearby.map((creature, index) => ({
      index,
      creature,
      catchRate: calculateCatchRate(creature.speciesId, creature.slots, this.state.batch?.failPenalty ?? 0),
      energyCost: calculateEnergyCost(creature.speciesId, creature.slots)
    }));
    const now = Date.now();
    const timeSinceSpawn = now - this.state.lastSpawnAt;
    const nextBatchInMs = Math.max(0, SPAWN_INTERVAL_MS - timeSinceSpawn);
    return { nearby, energy: this.state.energy, batch: this.state.batch, nextBatchInMs };
  }
  catch(nearbyIndex, rng = Math.random) {
    if (isCollectionFull(this.state)) {
      throw new Error("Collection is full (15 creatures). Archive or release a creature first.");
    }
    const result = attemptCatch(this.state, nearbyIndex, rng);
    if (result.success) {
      const config3 = loadConfig();
      grantXp(this.state, config3.leveling.xpPerCatch);
      const discovery = recordDiscovery(this.state, result.creature.speciesId);
      if (discovery.isNew) {
        result.discovery = discovery;
      }
    }
    return result;
  }
  breedPreview(parentAId, parentBId) {
    return previewBreed(this.state, parentAId, parentBId);
  }
  breedExecute(parentAId, parentBId, rng = Math.random) {
    return executeBreed(this.state, parentAId, parentBId, rng);
  }
  buildBreedTable() {
    return buildBreedTable(this.state);
  }
  archive(creatureId) {
    return archiveCreature(this.state, creatureId);
  }
  release(creatureId) {
    return releaseCreature(this.state, creatureId);
  }
  status() {
    return {
      profile: this.state.profile,
      collectionCount: this.state.collection.length,
      archiveCount: this.state.archive.length,
      energy: this.state.energy,
      nearbyCount: this.state.nearby.length,
      batchAttemptsRemaining: this.state.batch?.attemptsRemaining ?? 0,
      gold: this.state.gold,
      discoveredCount: this.state.discoveredSpecies.length,
      activeQuest: this.state.activeQuest
    };
  }
  upgrade(creatureId, slotId) {
    return performUpgrade(this.state, creatureId, slotId);
  }
  questStart(creatureIds) {
    return startQuest(this.state, creatureIds);
  }
  questCheck() {
    return checkQuest(this.state);
  }
  getGold() {
    return this.state.gold;
  }
  getDiscoveredSpecies() {
    return [...this.state.discoveredSpecies];
  }
  getAdvisorContext(action, result) {
    return buildAdvisorContext(action, result, this.state);
  }
  getState() {
    return this.state;
  }
};

// src/engine/rarity.ts
function calculateTraitRarityScore(speciesId, slotId, variantId) {
  const species = getSpeciesById(speciesId);
  if (!species) return 50;
  const pool = species.traitPools[slotId];
  if (!pool || pool.length === 0) return 50;
  if (pool.length === 1) return 50;
  const sorted = [...pool].sort((a, b) => b.spawnRate - a.spawnRate);
  const index = sorted.findIndex((t) => t.id === variantId);
  if (index === -1) return 50;
  return index / (sorted.length - 1) * 99 + 1;
}
function calculateColorRarityScore(color) {
  const config3 = loadConfig();
  const colorMap = config3.colors;
  const entries = Object.entries(colorMap).sort((a, b) => b[1] - a[1]);
  if (entries.length <= 1) return 50;
  const index = entries.findIndex(([name]) => name === color);
  if (index === -1) return 50;
  return index / (entries.length - 1) * 99 + 1;
}
function calculateSlotScore(speciesId, slot) {
  const traitScore = calculateTraitRarityScore(speciesId, slot.slotId, slot.variantId);
  const colorScore = calculateColorRarityScore(slot.color);
  return 0.8 * traitScore + 0.2 * colorScore;
}
function calculateCreatureScore(speciesId, slots) {
  if (slots.length === 0) return 50;
  const total = slots.reduce((sum, slot) => sum + calculateSlotScore(speciesId, slot), 0);
  return Math.round(total / slots.length);
}

// src/renderers/simple-text.ts
var stringWidth = require_string_width();
var RESET = "\x1B[0m";
var BOLD = "\x1B[1m";
var DIM = "\x1B[2m";
var WHITE = "\x1B[97m";
var BLUE = "\x1B[34m";
var GREEN = "\x1B[32m";
var YELLOW = "\x1B[33m";
var RED = "\x1B[31m";
var COLOR_ANSI = {
  grey: "\x1B[90m",
  white: "\x1B[97m",
  green: "\x1B[32m",
  cyan: "\x1B[36m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  yellow: "\x1B[33m",
  red: "\x1B[31m"
};
var ENERGY_ICON = `${YELLOW}\u26A1${RESET}`;
function calculateRarityColor(rarityScore) {
  if (rarityScore <= 12.5) return COLOR_ANSI.grey;
  if (rarityScore <= 25) return COLOR_ANSI.white;
  if (rarityScore <= 37.5) return COLOR_ANSI.green;
  if (rarityScore <= 50) return COLOR_ANSI.cyan;
  if (rarityScore <= 62.5) return COLOR_ANSI.blue;
  if (rarityScore <= 75) return COLOR_ANSI.magenta;
  if (rarityScore <= 87.5) return COLOR_ANSI.yellow;
  return COLOR_ANSI.red;
}
function renderCreatureLines(slots, speciesId) {
  const slotArt = {};
  for (const s of slots) {
    const trait = speciesId ? getTraitDefinition(speciesId, s.variantId) : getVariantById(s.variantId);
    slotArt[s.slotId] = trait?.art ?? "???";
  }
  const slotColor = {};
  for (const s of slots) {
    const rarityScore = speciesId ? calculateTraitRarityScore(speciesId, s.slotId, s.variantId) : 50;
    slotColor[s.slotId] = calculateRarityColor(rarityScore);
  }
  const species = speciesId ? getSpeciesById(speciesId) : void 0;
  if (!species?.art) {
    return ["      ???"];
  }
  return species.art.map((line, lineIndex) => {
    let result = line;
    const replacements = [
      ["EE", slotArt["eyes"] ?? ""],
      ["MM", slotArt["mouth"] ?? ""],
      ["BB", slotArt["body"] ?? ""],
      ["TT", slotArt["tail"] ?? ""]
    ];
    for (const [placeholder, art] of replacements) {
      result = result.replace(placeholder, art);
    }
    const zoneSlot = species.zones?.[lineIndex];
    const color = zoneSlot ? slotColor[zoneSlot] ?? WHITE : WHITE;
    return "      " + color + result + RESET;
  });
}
function renderGreySilhouette(slots, speciesId) {
  const slotArt = {};
  for (const s of slots) {
    const trait = getTraitDefinition(speciesId, s.variantId);
    slotArt[s.slotId] = trait?.art ?? "???";
  }
  const species = getSpeciesById(speciesId);
  const GREY = COLOR_ANSI.grey;
  if (!species?.art) {
    return [GREY + "???" + RESET];
  }
  return species.art.map((line) => {
    let result = line;
    const replacements = [
      ["EE", slotArt["eyes"] ?? ""],
      ["MM", slotArt["mouth"] ?? ""],
      ["BB", slotArt["body"] ?? ""],
      ["TT", slotArt["tail"] ?? ""]
    ];
    for (const [placeholder, art] of replacements) {
      result = result.replace(placeholder, art);
    }
    return GREY + result + RESET;
  });
}
function energyBar(energy, maxEnergy) {
  const filled = Math.min(10, Math.round(energy / maxEnergy * 10));
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(10 - filled);
  return `  ${ENERGY_ICON} ${GREEN}${bar}${RESET} ${energy}/${maxEnergy}`;
}
function xpBar(xp, nextXp) {
  const filled = Math.min(10, Math.round(xp / nextXp * 10));
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(10 - filled);
  return `${GREEN}${bar}${RESET} ${xp}/${nextXp}`;
}
function divider() {
  return `  ${DIM}${"\u2500".repeat(46)}${RESET}`;
}
var ART_PAD = 20;
function padArtLine(line, targetWidth) {
  const w = stringWidth(line);
  const pad = Math.max(0, targetWidth - w);
  return line + " ".repeat(pad);
}
function renderCreatureSideBySide(slots, speciesId) {
  const artLines = renderCreatureLines(slots, speciesId);
  const order = ["eyes", "mouth", "body", "tail"];
  const traitLines = [];
  for (const slotId of order) {
    const s = slots.find((sl) => sl.slotId === slotId);
    if (s) {
      const variant = speciesId ? getTraitDefinition(speciesId, s.variantId) : getVariantById(s.variantId);
      const name = variant?.name ?? s.variantId;
      const rarityScore = speciesId ? calculateTraitRarityScore(speciesId, s.slotId, s.variantId) : 50;
      const rarityColor = calculateRarityColor(rarityScore);
      const score = speciesId ? Math.round(calculateSlotScore(speciesId, s)) : 50;
      traitLines.push(`${DIM}${slotId.padEnd(5)}${RESET} ${rarityColor}${name}${RESET} ${DIM}[${score}]${RESET}`);
    } else {
      traitLines.push(`${DIM}${slotId.padEnd(5)}${RESET} ${DIM}\u2014${RESET}`);
    }
  }
  const lines = [];
  const maxLines = Math.max(artLines.length, traitLines.length);
  for (let i = 0; i < maxLines; i++) {
    const artLine = artLines[i] ?? "";
    const traitLine = traitLines[i] ?? "";
    lines.push(padArtLine(artLine, ART_PAD) + traitLine);
  }
  return lines;
}
var SimpleTextRenderer = class {
  renderScan(result) {
    const lines = [];
    lines.push(`  ${ENERGY_ICON} ${GREEN}${"\u2588".repeat(Math.min(10, Math.round(result.energy / MAX_ENERGY * 10)))}${"\u2591".repeat(10 - Math.min(10, Math.round(result.energy / MAX_ENERGY * 10)))}${RESET} ${result.energy}/${MAX_ENERGY}`);
    lines.push("");
    for (const entry of result.nearby) {
      const c = entry.creature;
      const rate = Math.round(entry.catchRate * 100);
      const statsIndent = " ".repeat(ART_PAD);
      const creatureScore = calculateCreatureScore(c.speciesId, c.slots);
      lines.push(`  ${DIM}[${entry.index + 1}]${RESET} ${BOLD}${c.name}${RESET} ${DIM}(${c.speciesId})${RESET}  \u2B50 ${creatureScore}`);
      lines.push(`${statsIndent}${DIM}Rate:${RESET} ${rate}%  ${DIM}Cost:${RESET} ${entry.energyCost}${ENERGY_ICON}`);
      for (const line of renderCreatureSideBySide(c.slots, c.speciesId)) {
        lines.push(line);
      }
      lines.push("");
    }
    lines.push(divider());
    lines.push(`  ${WHITE}Use ${BLUE}/catch <number>${WHITE} to attempt a catch${RESET}`);
    if (result.nextBatchInMs > 0) {
      const mins = Math.ceil(result.nextBatchInMs / 6e4);
      lines.push(`  ${DIM}Next batch in ~${mins} min${RESET}`);
    } else {
      lines.push(`  ${DIM}New batch available now${RESET}`);
    }
    return lines.join("\n");
  }
  renderCatch(result) {
    const c = result.creature;
    const lines = [];
    if (result.success) {
      lines.push(`  ${GREEN}${BOLD}\u2726 CAUGHT! \u2726${RESET}`);
      lines.push("");
      const creatureScore = calculateCreatureScore(c.speciesId, c.slots);
      lines.push(`  ${BOLD}${c.name}${RESET} joined your collection!  \u2B50 ${creatureScore}`);
      for (const line of renderCreatureSideBySide(c.slots, c.speciesId)) {
        lines.push(line);
      }
      lines.push("");
      if (result.discovery?.isNew) {
        lines.push(`  ${YELLOW}${BOLD}\u2726 NEW SPECIES: ${result.discovery.speciesId} \u2726${RESET}  ${GREEN}+${result.discovery.bonusXp} bonus XP${RESET}`);
      }
      lines.push(`  ${DIM}+${result.xpEarned} XP   -${result.energySpent}${RESET}${ENERGY_ICON}`);
      lines.push("");
      lines.push(divider());
    } else if (result.fled) {
      lines.push(`  ${RED}${BOLD}\u2726 FLED \u2726${RESET}`);
      lines.push("");
      lines.push(`  ${BOLD}${c.name}${RESET} fled into the void!`);
      lines.push(`  ${DIM}The creature is gone.${RESET}`);
      lines.push("");
      lines.push(`  ${DIM}-${result.energySpent}${RESET}${ENERGY_ICON}`);
      lines.push("");
      lines.push(divider());
    } else {
      lines.push(`  ${YELLOW}${BOLD}\u2726 ESCAPED \u2726${RESET}`);
      lines.push("");
      lines.push(`  ${BOLD}${c.name}${RESET} slipped away!`);
      for (const line of renderCreatureSideBySide(c.slots, c.speciesId)) {
        lines.push(line);
      }
      lines.push("");
      lines.push(`  ${DIM}-${result.energySpent}${RESET}${ENERGY_ICON}   ${DIM}${result.attemptsRemaining} attempts remaining${RESET}`);
      lines.push("");
      lines.push(divider());
    }
    return lines.join("\n");
  }
  renderBreedPreview(preview) {
    const { parentA, parentB, parentAIndex, parentBIndex, slotInheritance, energyCost } = preview;
    const lines = [];
    lines.push(`  Breed ${BOLD}#${parentAIndex} ${parentA.name}${RESET} ${DIM}(Lv ${parentA.generation})${RESET} + ${BOLD}#${parentBIndex} ${parentB.name}${RESET} ${DIM}(Lv ${parentB.generation})${RESET}?`);
    lines.push(`  ${DIM}Both parents will be consumed.${RESET}`);
    lines.push("");
    const scoreA = calculateCreatureScore(parentA.speciesId, parentA.slots);
    lines.push(`  ${BOLD}Parent A: #${parentAIndex} ${parentA.name}${RESET}  \u2B50 ${scoreA}`);
    for (const line of renderCreatureSideBySide(parentA.slots, parentA.speciesId)) {
      lines.push(line);
    }
    lines.push("");
    const scoreB = calculateCreatureScore(parentB.speciesId, parentB.slots);
    lines.push(`  ${BOLD}Parent B: #${parentBIndex} ${parentB.name}${RESET}  \u2B50 ${scoreB}`);
    for (const line of renderCreatureSideBySide(parentB.slots, parentB.speciesId)) {
      lines.push(line);
    }
    lines.push("");
    lines.push(`  ${BOLD}Inheritance odds:${RESET}`);
    for (const si of slotInheritance) {
      const slotLabel = si.slotId.padEnd(5);
      const pctA = `${Math.round(si.parentAChance * 100)}%`;
      const pctB = `${Math.round(si.parentBChance * 100)}%`;
      const traitScoreA = Math.round(calculateTraitRarityScore(parentA.speciesId, si.slotId, si.parentAVariant.id));
      const traitScoreB = Math.round(calculateTraitRarityScore(parentB.speciesId, si.slotId, si.parentBVariant.id));
      const colorA = calculateRarityColor(traitScoreA);
      const colorB = calculateRarityColor(traitScoreB);
      lines.push(
        `    ${WHITE}${slotLabel}${RESET}  ${DIM}A:${RESET} ${colorA}${si.parentAVariant.name} [${traitScoreA}]${RESET} ${pctA}  ${DIM}B:${RESET} ${colorB}${si.parentBVariant.name} [${traitScoreB}]${RESET} ${pctB}`
      );
    }
    lines.push("");
    lines.push(`  ${DIM}Energy cost: ${energyCost}${RESET}${ENERGY_ICON}`);
    lines.push(divider());
    lines.push(`  ${DIM}Run /breed ${parentAIndex} ${parentBIndex} --confirm to proceed${RESET}`);
    return lines.join("\n");
  }
  renderBreedResult(result) {
    const { child, parentA, parentB, inheritedFrom } = result;
    const lines = [];
    lines.push(`  ${GREEN}${BOLD}\u2726 BREED SUCCESS \u2726${RESET}`);
    lines.push("");
    const childScore = calculateCreatureScore(child.speciesId, child.slots);
    lines.push(`  ${BOLD}${child.name}${RESET} was born!  \u2B50 ${childScore}`);
    for (const line of renderCreatureSideBySide(child.slots, child.speciesId)) {
      lines.push(line);
    }
    lines.push("");
    lines.push(`  ${DIM}Inherited from:${RESET}`);
    for (const slot of child.slots) {
      const from = inheritedFrom[slot.slotId];
      const parentName = from === "A" ? parentA.name : parentB.name;
      lines.push(`    ${DIM}${slot.slotId}${RESET} \u2192 ${from} (${parentName})`);
    }
    lines.push("");
    lines.push(`  ${DIM}Both parents consumed.${RESET}`);
    lines.push("");
    lines.push(divider());
    return lines.join("\n");
  }
  renderCollection(collection) {
    const lines = [];
    if (collection.length === 0) {
      return "  No creatures in your collection yet. Use /scan to find some!";
    }
    lines.push(`  ${DIM}Your creatures (${collection.length})${RESET}`);
    lines.push("");
    collection.forEach((creature, i) => {
      const creatureScore = calculateCreatureScore(creature.speciesId, creature.slots);
      const num = `${i + 1}.`;
      const totalRank = creature.slots.reduce((sum, s) => {
        const m = s.variantId.match(/_r(\d+)$/);
        return sum + (m ? parseInt(m[1], 10) : 0);
      }, 0);
      const rankLabel = totalRank > 0 ? `  ${YELLOW}\u2605${totalRank}${RESET}` : "";
      lines.push(`  ${BOLD}${num}${RESET} ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}  \u2B50 ${creatureScore}${rankLabel}`);
      for (const line of renderCreatureSideBySide(creature.slots, creature.speciesId)) {
        lines.push(line);
      }
      lines.push("");
    });
    lines.push(divider());
    return lines.join("\n");
  }
  renderArchive(archive) {
    const lines = [];
    if (archive.length === 0) {
      return "  No creatures in your archive yet.";
    }
    lines.push(`  ${DIM}Archive (${archive.length})${RESET}`);
    lines.push("");
    for (const creature of archive) {
      const creatureScore = calculateCreatureScore(creature.speciesId, creature.slots);
      lines.push(`  ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}  \u2B50 ${creatureScore}`);
      for (const line of renderCreatureSideBySide(creature.slots, creature.speciesId)) {
        lines.push(line);
      }
      lines.push("");
    }
    lines.push(divider());
    return lines.join("\n");
  }
  renderEnergy(energy, maxEnergy) {
    return energyBar(energy, maxEnergy);
  }
  renderStatus(result) {
    const p = result.profile;
    const nextXp = p.level * 100;
    const lines = [];
    lines.push(`  ${BOLD}Player Status${RESET}`);
    lines.push("");
    lines.push(`  Level: ${p.level}`);
    lines.push(`  XP:    ${xpBar(p.xp, nextXp)}`);
    lines.push(`  ${ENERGY_ICON} ${GREEN}${"\u2588".repeat(Math.min(10, Math.round(result.energy / MAX_ENERGY * 10)))}${"\u2591".repeat(10 - Math.min(10, Math.round(result.energy / MAX_ENERGY * 10)))}${RESET} ${result.energy}/${MAX_ENERGY}`);
    lines.push(`  ${YELLOW}Gold:${RESET}  ${result.gold}`);
    lines.push("");
    lines.push(`  Catches:    ${p.totalCatches}`);
    lines.push(`  Merges:     ${p.totalMerges}`);
    lines.push(`  Upgrades:   ${p.totalUpgrades}`);
    lines.push(`  Quests:     ${p.totalQuests}`);
    lines.push(`  Collection: ${result.collectionCount} creatures`);
    lines.push(`  Archive:    ${result.archiveCount} creatures`);
    lines.push(`  Discovered: ${result.discoveredCount} species`);
    lines.push(`  Streak:     ${p.currentStreak} days ${DIM}(best: ${p.longestStreak})${RESET}`);
    lines.push(`  Nearby:     ${result.nearbyCount} creatures`);
    lines.push(`  Ticks:      ${p.totalTicks.toLocaleString()}`);
    if (result.activeQuest) {
      const q = result.activeQuest;
      lines.push("");
      lines.push(`  ${BLUE}${BOLD}Active Quest${RESET}  ${DIM}${q.sessionsRemaining} session(s) remaining  power ${q.teamPower}${RESET}`);
    }
    lines.push(divider());
    return lines.join("\n");
  }
  renderNotification(notification) {
    return notification.message;
  }
  renderBreedTable(table) {
    if (table.species.length === 0) {
      return "  No breedable pairs yet \u2014 you need 2+ creatures of the same species.\n  Use /scan and /catch to find more.";
    }
    const lines = [];
    const totalCreatures = table.species.reduce((n, s) => n + s.rows.length, 0);
    lines.push(`  ${DIM}${"\u2550".repeat(74)}${RESET}`);
    lines.push(`  ${BOLD}BREED${RESET}   ${DIM}${totalCreatures} creatures, ${table.species.length} species${RESET}`);
    lines.push(`  ${DIM}${"\u2550".repeat(74)}${RESET}`);
    lines.push("");
    for (const s of table.species) {
      this.appendBreedSpeciesSection(lines, s);
      lines.push("");
    }
    lines.push(`  ${DIM}${"\u2500".repeat(74)}${RESET}`);
    lines.push(`  ${DIM}Run /breed N M to preview a pair  \xB7  add --confirm to execute${RESET}`);
    lines.push(`  ${DIM}${"\u2500".repeat(74)}${RESET}`);
    return lines.join("\n");
  }
  appendBreedSpeciesSection(lines, species) {
    lines.push(`  ${BOLD}${species.speciesId}${RESET}  ${DIM}${species.rows.length} creatures${RESET}`);
    lines.push(`  ${DIM}${"\u2500".repeat(74)}${RESET}`);
    const header = `  ${DIM}  #    NAME       LV    EYES             MOUTH            BODY             TAIL${RESET}`;
    const rule = `  ${DIM}  \u2500\u2500\u2500  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  \u2500\u2500    \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500   \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500   \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500   \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`;
    const silhouette = renderGreySilhouette(species.silhouette, species.speciesId);
    const rowTexts = [header, rule];
    for (const row of species.rows) {
      rowTexts.push(this.breedRowLine(row, species.speciesId));
    }
    const total = Math.max(silhouette.length, rowTexts.length);
    for (let i = 0; i < total; i++) {
      const sil = silhouette[i] ?? "";
      const txt = rowTexts[i] ?? "";
      lines.push(this.padSilhouette(sil) + " " + txt);
    }
  }
  padSilhouette(silhouetteLine) {
    const visible = silhouetteLine.replace(/\x1b\[[0-9;]*m/g, "");
    const target = 14;
    const pad = Math.max(0, target - stringWidth(visible));
    return "  " + silhouetteLine + " ".repeat(pad);
  }
  breedRowLine(row, speciesId) {
    const { creatureIndex, creature } = row;
    const num = String(creatureIndex).padStart(3);
    const nameCell = creature.name.padEnd(9);
    const lv = String(creature.generation).padStart(2);
    const order = ["eyes", "mouth", "body", "tail"];
    const cells = [];
    for (const slotId of order) {
      const slot = creature.slots.find((s) => s.slotId === slotId);
      if (!slot) {
        cells.push(`${DIM}\u2014${RESET}`.padEnd(16));
        continue;
      }
      const variant = getTraitDefinition(speciesId, slot.variantId);
      const traitName = variant?.name ?? slot.variantId;
      const score = Math.round(
        calculateTraitRarityScore(speciesId, slot.slotId, slot.variantId)
      );
      const color = calculateRarityColor(score);
      const label = `${traitName} [${score}]`;
      const visibleLen = stringWidth(label);
      const pad = Math.max(0, 14 - visibleLen);
      cells.push(`${color}${label}${RESET}` + " ".repeat(pad));
    }
    return `  ${num}  ${BOLD}${nameCell}${RESET}  ${lv}   ` + cells.join("   ");
  }
  renderUpgradeResult(result) {
    const lines = [];
    const slotLabel = result.slotId.padEnd(5);
    const rankColors = [
      COLOR_ANSI.grey,
      // rank 0→1
      COLOR_ANSI.white,
      // rank 1→2
      COLOR_ANSI.green,
      // rank 2→3
      COLOR_ANSI.cyan,
      // rank 3→4
      COLOR_ANSI.blue,
      // rank 4→5
      COLOR_ANSI.magenta,
      // rank 5→6
      COLOR_ANSI.yellow,
      // rank 6→7
      COLOR_ANSI.red
      // rank 7→8
    ];
    const fromColor = rankColors[result.fromRank] ?? COLOR_ANSI.grey;
    const toColor = rankColors[result.toRank] ?? COLOR_ANSI.red;
    lines.push(`  ${GREEN}${BOLD}\u2726 UPGRADE \u2726${RESET}`);
    lines.push("");
    lines.push(`  ${DIM}Slot:${RESET}  ${WHITE}${slotLabel}${RESET}`);
    lines.push(`  ${DIM}Rank:${RESET}  ${fromColor}\u2605${result.fromRank}${RESET} \u2192 ${toColor}\u2605${result.toRank}${RESET}`);
    lines.push(`  ${DIM}Cost:${RESET}  ${YELLOW}${result.goldCost} gold${RESET}`);
    lines.push("");
    lines.push(divider());
    return lines.join("\n");
  }
  renderQuestStart(result) {
    const lines = [];
    const q = result.quest;
    lines.push(`  ${BLUE}${BOLD}\u2726 QUEST STARTED \u2726${RESET}`);
    lines.push("");
    lines.push(`  ${DIM}Team:${RESET}      ${result.creaturesLocked.length} creature(s)`);
    lines.push(`  ${DIM}Power:${RESET}     ${q.teamPower}`);
    lines.push(`  ${DIM}Duration:${RESET}  ${q.sessionsRemaining} session(s)`);
    lines.push("");
    lines.push(`  ${DIM}Creatures are away on the quest.${RESET}`);
    lines.push(`  ${DIM}Use /quest check once complete to collect rewards.${RESET}`);
    lines.push("");
    lines.push(divider());
    return lines.join("\n");
  }
  renderQuestComplete(result) {
    const lines = [];
    lines.push(`  ${YELLOW}${BOLD}\u2726 QUEST COMPLETE \u2726${RESET}`);
    lines.push("");
    lines.push(`  ${YELLOW}+${result.goldEarned} gold${RESET}  ${GREEN}+${result.xpEarned} XP${RESET}`);
    lines.push("");
    lines.push(`  ${DIM}${result.creaturesReturned.length} creature(s) returned safely.${RESET}`);
    lines.push("");
    lines.push(divider());
    return lines.join("\n");
  }
  renderLevelUp(result) {
    const lines = [];
    lines.push(`  ${YELLOW}${BOLD}\u2726 LEVEL UP \u2726${RESET}`);
    lines.push("");
    lines.push(`  ${DIM}Level:${RESET} ${result.oldLevel} \u2192 ${BOLD}${result.newLevel}${RESET}`);
    lines.push("");
    lines.push(divider());
    return lines.join("\n");
  }
  renderDiscovery(result) {
    const lines = [];
    if (result.isNew) {
      lines.push(`  ${YELLOW}${BOLD}\u2726 NEW SPECIES DISCOVERED \u2726${RESET}`);
      lines.push("");
      lines.push(`  ${BOLD}${result.speciesId}${RESET} added to your Compidex!`);
      lines.push(`  ${GREEN}+${result.bonusXp} bonus XP${RESET}`);
      lines.push(`  ${DIM}Total discovered: ${result.totalDiscovered}${RESET}`);
      lines.push("");
      lines.push(divider());
    }
    return lines.join("\n");
  }
  /**
   * Compact one-line status bar: gold, energy, collection size, XP%, level, team power.
   */
  renderStatusBar(progress) {
    const goldPart = `${YELLOW}\u{1FA99} ${progress.gold}g${RESET}`;
    const energyPart = `${ENERGY_ICON} ${GREEN}${progress.energy}/${progress.energyMax}${RESET}`;
    const collectionPart = `\u{1F4E6} ${DIM}${progress.collectionSize}/${progress.collectionMax}${RESET}`;
    const xpPart = `\u2B50 ${GREEN}${progress.xpPercent}% XP${RESET}`;
    const levelPart = `${BOLD}Lv.${progress.level}${RESET}`;
    const powerPart = `\u2694 ${DIM}${progress.teamPower} power${RESET}`;
    return `  ${levelPart}  ${goldPart}  ${energyPart}  ${collectionPart}  ${xpPart}  ${powerPart}`;
  }
  /**
   * Numbered action menu with costs and recommended marker.
   */
  renderActionMenu(entries) {
    if (entries.length === 0) return "";
    const lines = [];
    lines.push(`  ${DIM}What next?${RESET}`);
    for (const entry of entries) {
      const num = `${BOLD}${entry.number}.${RESET}`;
      const cost = entry.cost ? `  ${DIM}(${entry.cost})${RESET}` : "";
      const rec = entry.number === 1 ? `  ${GREEN}\u2605${RESET}` : "";
      lines.push(`  ${num} ${entry.label}${cost}${rec}`);
    }
    return lines.join("\n");
  }
  /**
   * Detailed progress panel: XP bar, tier progress, milestones.
   */
  renderProgressPanel(progress) {
    const lines = [];
    lines.push(divider());
    lines.push(`  ${BOLD}Progress${RESET}`);
    const filled = Math.min(10, Math.round(progress.xpPercent / 100 * 10));
    const bar = `${GREEN}${"\u2588".repeat(filled)}${"\u2591".repeat(10 - filled)}${RESET}`;
    lines.push(`  ${DIM}XP:${RESET}    ${bar}  ${progress.xp}/${progress.xpToNextLevel}  ${DIM}Lv ${progress.level}${RESET}`);
    lines.push(`  ${DIM}Gold:${RESET}  ${YELLOW}${progress.gold}${RESET}`);
    lines.push(`  ${DIM}Power:${RESET} ${progress.teamPower}  ${DIM}\u2192 ${progress.nextPowerMilestone}${RESET}`);
    lines.push(`  ${DIM}Crew:${RESET}  ${progress.collectionSize}/${progress.collectionMax}`);
    if (progress.bestTrait) {
      const bt = progress.bestTrait;
      lines.push(`  ${DIM}Best:${RESET}  ${bt.creatureName} ${bt.slot} rank ${bt.rank} ${DIM}(${bt.tierName})${RESET}`);
    }
    if (progress.nearestTierThreshold) {
      const ntt = progress.nearestTierThreshold;
      lines.push(`  ${DIM}Close:${RESET} ${ntt.creatureName} ${ntt.slot} rank ${ntt.currentRank}\u2192${ntt.targetRank} via ${ntt.method}`);
    }
    if (progress.nextSpeciesUnlock) {
      lines.push(`  ${DIM}Unlock:${RESET} ${progress.nextSpeciesUnlock.species} at Lv ${progress.nextSpeciesUnlock.level}`);
    }
    lines.push(`  ${DIM}Found:${RESET} ${progress.discoveredCount}/${progress.totalSpecies} species`);
    lines.push(divider());
    return lines.join("\n");
  }
  renderCompanionOverview(_overview) {
    return "";
  }
};

// src/cli.ts
var statePath = process.env.COMPI_STATE_PATH || path3.join(os2.homedir(), ".compi", "state.json");
var args = process.argv.slice(2);
var command = args[0];
var jsonMode = args.includes("--json");
var stateManager = new StateManager(statePath);
var state = stateManager.load();
var engine = new GameEngine(state);
var renderer = new SimpleTextRenderer();
function output(data, text) {
  if (jsonMode) {
    console.log(JSON.stringify(data));
  } else {
    console.log(text);
  }
}
function save() {
  stateManager.save(engine.getState());
}
function printAdvisorOutput(actionType, result) {
  if (jsonMode) return;
  const ctx = engine.getAdvisorContext(actionType, result);
  console.log("");
  console.log(renderer.renderStatusBar(ctx.progress));
  if (ctx.mode === "advisor" && ctx.suggestedActions.length > 0) {
    const entries = ctx.suggestedActions.map((a) => ({
      number: a.priority,
      label: a.label,
      cost: a.cost.gold ? `${a.cost.gold}g` : a.cost.energy ? `${a.cost.energy}\u26A1` : void 0
    }));
    console.log(renderer.renderActionMenu(entries));
  }
}
try {
  switch (command) {
    case "tick": {
      const sessionId = args.find((a) => a.startsWith("--session="))?.split("=")[1];
      const eventType = args.find((a) => a.startsWith("--event="))?.split("=")[1];
      const result = engine.processTick({
        timestamp: Date.now(),
        sessionId,
        eventType
      });
      save();
      output(result, result.notifications.map((n) => renderer.renderNotification(n)).join("\n"));
      break;
    }
    case "scan": {
      const result = engine.scan();
      save();
      output(result, renderer.renderScan(result));
      break;
    }
    case "catch": {
      const index = parseInt(args[1], 10) - 1;
      if (isNaN(index)) {
        console.error("Usage: compi catch [number]");
        process.exit(1);
      }
      const result = engine.catch(index);
      save();
      output(result, renderer.renderCatch(result));
      printAdvisorOutput("catch", result);
      break;
    }
    case "collection": {
      const collection = engine.getState().collection;
      output(collection, renderer.renderCollection(collection));
      break;
    }
    case "breed":
    case "merge": {
      const parentAId = args[1];
      const parentBId = args[2];
      const confirm = args.includes("--confirm");
      if (!parentAId || !parentBId) {
        console.error("Usage: compi breed <parentAId> <parentBId> [--confirm]");
        process.exit(1);
      }
      if (confirm) {
        const result = engine.breedExecute(parentAId, parentBId);
        save();
        output(result, renderer.renderBreedResult(result));
        printAdvisorOutput("breed", result);
      } else {
        const preview = engine.breedPreview(parentAId, parentBId);
        output(preview, renderer.renderBreedPreview(preview));
      }
      break;
    }
    case "archive": {
      const creatureId = args[1];
      if (creatureId) {
        const result = engine.archive(creatureId);
        save();
        output(result, `Archived ${result.creature.name}.`);
      } else {
        const archive = engine.getState().archive;
        output(archive, renderer.renderArchive(archive));
      }
      break;
    }
    case "release": {
      const creatureId = args[1];
      if (!creatureId) {
        console.error("Usage: compi release <id>");
        process.exit(1);
      }
      engine.release(creatureId);
      save();
      output({ released: creatureId }, `Released creature ${creatureId}.`);
      break;
    }
    case "energy": {
      const currentState = engine.getState();
      const energyText = renderer.renderEnergy(currentState.energy, MAX_ENERGY);
      output({ energy: currentState.energy, maxEnergy: MAX_ENERGY }, energyText);
      break;
    }
    case "status": {
      const result = engine.status();
      output(result, renderer.renderStatus(result));
      break;
    }
    case "settings": {
      const setting = args[1];
      const value = args[2];
      if (setting && value) {
        const gameState = engine.getState();
        if (setting === "notifications") {
          gameState.settings.notificationLevel = value;
        }
        save();
        output(gameState.settings, `Settings updated: ${setting} = ${value}`);
      } else {
        const settings = engine.getState().settings;
        output(settings, `SETTINGS

Notifications: ${settings.notificationLevel}`);
      }
      break;
    }
    case "upgrade": {
      const creatureIndex = parseInt(args[1], 10);
      const slotId = args[2];
      if (isNaN(creatureIndex) || !slotId) {
        console.error("Usage: compi upgrade <creatureIndex> <slotId>");
        console.error("  creatureIndex: 1-indexed position in your collection");
        console.error("  slotId: eyes | mouth | body | tail");
        process.exit(1);
      }
      const collection = engine.getState().collection;
      if (creatureIndex < 1 || creatureIndex > collection.length) {
        console.error(`No creature at index ${creatureIndex}. You have ${collection.length} creatures.`);
        process.exit(1);
      }
      const creatureId = collection[creatureIndex - 1].id;
      const result = engine.upgrade(creatureId, slotId);
      save();
      output(result, renderer.renderUpgradeResult(result));
      printAdvisorOutput("upgrade", result);
      break;
    }
    case "quest": {
      const subCmd = args[1];
      if (subCmd === "start") {
        const creatureIds = args.slice(2);
        if (creatureIds.length === 0) {
          console.error("Usage: compi quest start <creatureId1> [creatureId2] [creatureId3]");
          process.exit(1);
        }
        const result = engine.questStart(creatureIds);
        save();
        output(result, renderer.renderQuestStart(result));
        printAdvisorOutput("quest", result);
      } else if (subCmd === "check") {
        const result = engine.questCheck();
        save();
        if (result) {
          output(result, renderer.renderQuestComplete(result));
          printAdvisorOutput("quest_complete", result);
        } else {
          const activeQuest = engine.getState().activeQuest;
          if (activeQuest) {
            output(activeQuest, `Quest in progress. ${activeQuest.sessionsRemaining} sessions remaining.`);
          } else {
            output(null, "No active quest. Use: compi quest start <creatureId1> [creatureId2] [creatureId3]");
          }
        }
      } else {
        console.error("Usage:");
        console.error("  compi quest start <creatureId1> [creatureId2] [creatureId3]");
        console.error("  compi quest check");
        process.exit(1);
      }
      break;
    }
    case "gold": {
      const gold = engine.getGold();
      output({ gold }, `Gold: ${gold} \u{1FA99}`);
      break;
    }
    default:
      console.log("Compi \u2014 Terminal Creature Collection Game\n");
      console.log("Commands:");
      console.log("  tick                    Record activity tick");
      console.log("  scan                    Show nearby creatures");
      console.log("  catch [n]               Catch creature #n");
      console.log("  collection              View your creatures");
      console.log("  breed <aId> <bId> [--confirm]  Preview or execute breed");
      console.log("  archive [id]            View archive or archive a creature");
      console.log("  release <id>            Permanently release a creature");
      console.log("  energy                  Show current energy");
      console.log("  status                  Your profile");
      console.log("  settings [key] [value]  View/change settings");
      console.log("  upgrade <index> <slot>  Upgrade a creature's trait (slot: eyes/mouth/body/tail)");
      console.log("  quest start <id...>     Send creatures on a quest");
      console.log("  quest check             Check if active quest is complete");
      console.log("  gold                    Show current gold balance");
      console.log("\nAdd --json for machine-readable output.");
      break;
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`Command "${command}" failed`, {
    args: args.join(" "),
    error: message,
    stack: err instanceof Error ? err.stack : void 0
  });
  if (jsonMode) {
    console.log(JSON.stringify({ error: message }));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exit(1);
}
