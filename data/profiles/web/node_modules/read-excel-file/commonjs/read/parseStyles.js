"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = parseStyles;
var _xlsx = require("../xml/xlsx.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
// http://officeopenxml.com/SSstyles.php
// Returns an array of cell styles.
// A cell style index is its ID.
function parseStyles(content, xml) {
  if (!content) {
    return {};
  }

  // https://social.msdn.microsoft.com/Forums/sqlserver/en-US/708978af-b598-45c4-a598-d3518a5a09f0/howwhen-is-cellstylexfs-vs-cellxfs-applied-to-a-cell?forum=os_binaryfile
  // https://www.office-forums.com/threads/cellxfs-cellstylexfs.2163519/
  var doc = xml.createDocument(content);
  var baseStyles = (0, _xlsx.getBaseStyles)(doc).map(parseCellStyle);
  var numberFormats = (0, _xlsx.getNumberFormats)(doc).map(parseNumberFormatStyle).reduce(function (formats, format) {
    // Format ID is a numeric index.
    // There're some standard "built-in" formats (in Excel) up to about `100`.
    formats[format.id] = format;
    return formats;
  }, []);
  var getCellStyle = function getCellStyle(xf) {
    if (xf.hasAttribute('xfId')) {
      return _objectSpread(_objectSpread({}, baseStyles[xf.xfId]), parseCellStyle(xf, numberFormats));
    }
    return parseCellStyle(xf, numberFormats);
  };
  return (0, _xlsx.getCellStyles)(doc).map(getCellStyle);
}
function parseNumberFormatStyle(numFmt) {
  return {
    id: numFmt.getAttribute('numFmtId'),
    template: numFmt.getAttribute('formatCode')
  };
}

// http://www.datypic.com/sc/ooxml/e-ssml_xf-2.html
function parseCellStyle(xf, numFmts) {
  var style = {};
  if (xf.hasAttribute('numFmtId')) {
    var numberFormatId = xf.getAttribute('numFmtId');
    // Built-in number formats don't have a `<numFmt/>` element in `styles.xml`.
    // https://hexdocs.pm/xlsxir/number_styles.html
    if (numFmts[numberFormatId]) {
      style.numberFormat = numFmts[numberFormatId];
    } else {
      style.numberFormat = {
        id: numberFormatId
      };
    }
  }
  return style;
}
//# sourceMappingURL=parseStyles.js.map