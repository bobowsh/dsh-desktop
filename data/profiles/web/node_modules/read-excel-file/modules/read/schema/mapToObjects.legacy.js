function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
import mapToObjects from './mapToObjects.js';
export default function mapToObjectsLegacyBehavior(data, schema) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var includeNullValues = options.includeNullValues,
    ignoreEmptyRows = options.ignoreEmptyRows,
    isColumnOriented = options.isColumnOriented,
    rowMap = options.rowMap;
  var defaultConversionOptions = {
    schemaPropertyValueForMissingColumn: undefined,
    schemaPropertyValueForUndefinedCellValue: undefined,
    schemaPropertyValueForNullCellValue: undefined,
    schemaPropertyShouldSkipRequiredValidationForMissingColumn: function schemaPropertyShouldSkipRequiredValidationForMissingColumn(column, _ref) {
      var path = _ref.path;
      return false;
    },
    getEmptyObjectValue: function getEmptyObjectValue(object, _ref2) {
      var path = _ref2.path;
      return path ? undefined : null;
    },
    getEmptyArrayValue: function getEmptyArrayValue() {
      return null;
    },
    arrayValueSeparator: ','
  };
  if (includeNullValues) {
    defaultConversionOptions.schemaPropertyValueForMissingColumn = null;
    defaultConversionOptions.schemaPropertyValueForUndefinedCellValue = null;
    defaultConversionOptions.schemaPropertyValueForNullCellValue = null;
    defaultConversionOptions.getEmptyObjectValue = function (object, _ref3) {
      var path = _ref3.path;
      return null;
    };
  }
  var result = mapToObjects(data, schema, _objectSpread(_objectSpread({}, defaultConversionOptions), {}, {
    rowIndexMap: rowMap,
    isColumnOriented: isColumnOriented
  }));
  if (ignoreEmptyRows !== false) {
    result.rows = result.rows.filter(function (_) {
      return _ !== defaultConversionOptions.getEmptyObjectValue(_, {
        path: undefined
      });
    });
  }
  return result;
}
//# sourceMappingURL=mapToObjects.legacy.js.map