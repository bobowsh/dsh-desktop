function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
import NumberType from '../../types/Number.js';
import StringType from '../../types/String.js';
import BooleanType from '../../types/Boolean.js';
import DateType from '../../types/Date.js';
var DEFAULT_OPTIONS = {
  schemaPropertyValueForMissingColumn: undefined,
  schemaPropertyValueForUndefinedCellValue: undefined,
  schemaPropertyValueForNullCellValue: null,
  schemaPropertyShouldSkipRequiredValidationForMissingColumn: function schemaPropertyShouldSkipRequiredValidationForMissingColumn() {
    return false;
  },
  // `getEmptyObjectValue(object, { path })` applies to both the top-level object
  // and any of its sub-objects.
  getEmptyObjectValue: function getEmptyObjectValue() {
    return null;
  },
  getEmptyArrayValue: function getEmptyArrayValue() {
    return null;
  },
  isColumnOriented: false,
  arrayValueSeparator: ','
};

/**
 * (this function is exported from `read-excel-file/map`)
 * Converts spreadsheet-alike data structure into an array of objects.
 * The first row should be the list of column headers.
 * @param {any[][]} data - An array of rows, each row being an array of cells.
 * @param {object} schema
 * @param {object} [options]
 * @param {null} [options.schemaPropertyValueForMissingColumn] — By default, when some of the `schema` columns are missing in the input `data`, those properties are set to `undefined` in the output objects. Pass `schemaPropertyValueForMissingColumn: null` to set such "missing column" properties to `null` in the output objects.
 * @param {null} [options.schemaPropertyValueForNullCellValue] — By default, when it encounters a `null` value in a cell in input `data`, it sets it to `undefined` in the output object. Pass `schemaPropertyValueForNullCellValue: null` to make it set such values as `null`s in output objects.
 * @param {null} [options.schemaPropertyValueForUndefinedCellValue] — By default, when it encounters an `undefined` value in a cell in input `data`, it it sets it to `undefined` in the output object. Pass `schemaPropertyValueForUndefinedCellValue: null` to make it set such values as `null`s in output objects.
 * @param {boolean} [options.schemaPropertyShouldSkipRequiredValidationForMissingColumn(column: string, { object })] — By default, it does apply `required` validation to `schema` properties for which columns are missing in the input `data`. One could pass a custom `schemaPropertyShouldSkipRequiredValidationForMissingColumn(column, { object })` to disable `required` validation for missing columns in some or all cases.
 * @param {function} [options.getEmptyObjectValue(object, { path })] — By default, it returns `null` for an "empty" resulting object. One could override that value using `getEmptyObjectValue(object, { path })` parameter. The value applies to both top-level object and any nested sub-objects in case of a nested schema, hence the additional `path?: string` parameter.
 * @param {function} [getEmptyArrayValue(array, { path })] — By default, it returns `null` for an "empty" array value. One could override that value using `getEmptyArrayValue(array, { path })` parameter.
 * @param {boolean} [options.isColumnOriented] — By default, the headers are assumed to be the first row in the `data`. Pass `isColumnOriented: true` if the headers are the first column in the `data`. i.e. if `data` is "transposed".
 * @param {object} [options.rowIndexMap] — Custom row index mapping `data` rows. If present, will overwrite the indexes of `data` rows with the indexes from this `rowIndexMap`.
 * @return {object[]}
 */
export default function mapToObjects(data, schema, options) {
  if (options) {
    options = _objectSpread(_objectSpread({}, DEFAULT_OPTIONS), options);
  } else {
    options = DEFAULT_OPTIONS;
  }
  var _options = options,
    isColumnOriented = _options.isColumnOriented,
    rowIndexMap = _options.rowIndexMap;
  validateSchema(schema);
  if (isColumnOriented) {
    data = transpose(data);
  }
  var columns = data[0];
  var results = [];
  var errors = [];
  for (var i = 1; i < data.length; i++) {
    var result = read(schema, data[i], i, undefined, columns, errors, options);
    results.push(result);
  }

  // Set the correct `row` number in `errors` if a custom `rowIndexMap` is supplied.
  if (rowIndexMap) {
    for (var _iterator = _createForOfIteratorHelperLoose(errors), _step; !(_step = _iterator()).done;) {
      var error = _step.value;
      // Convert the `row` index in `data` to the
      // actual `row` index in the spreadsheet.
      // `- 1` converts row number to row index.
      // `+ 1` converts row index to row number.
      error.row = rowIndexMap[error.row - 1] + 1;
    }
  }
  return {
    rows: results,
    errors: errors
  };
}
function read(schema, row, rowIndex, path, columns, errors, options) {
  var object = {};
  var isEmptyObject = true;
  var createError = function createError(_ref) {
    var column = _ref.column,
      value = _ref.value,
      errorMessage = _ref.error,
      reason = _ref.reason;
    var error = {
      error: errorMessage,
      row: rowIndex + 1,
      column: column,
      value: value
    };
    if (reason) {
      error.reason = reason;
    }
    if (schema[column].type) {
      error.type = schema[column].type;
    }
    return error;
  };
  var pendingRequiredChecks = [];

  // For each schema entry.
  var _loop = function _loop() {
    var key = _Object$keys[_i];
    var schemaEntry = schema[key];
    var isNestedSchema = _typeof(schemaEntry.type) === 'object' && !Array.isArray(schemaEntry.type);

    // The path of this property inside the resulting object.
    var propertyPath = "".concat(path || '', ".").concat(schemaEntry.prop);

    // Read the cell value for the schema entry.
    var cellValue;
    var columnIndex = columns.indexOf(key);
    var isMissingColumn = columnIndex < 0;
    if (!isMissingColumn) {
      cellValue = row[columnIndex];
    }
    var value;
    var error;
    var reason;

    // Get property `value` from cell value.
    if (isNestedSchema) {
      value = read(schemaEntry.type, row, rowIndex, propertyPath, columns, errors, options);
    } else {
      if (isMissingColumn) {
        value = options.schemaPropertyValueForMissingColumn;
      } else if (cellValue === undefined) {
        value = options.schemaPropertyValueForUndefinedCellValue;
      } else if (cellValue === null) {
        value = options.schemaPropertyValueForNullCellValue;
      } else if (Array.isArray(schemaEntry.type)) {
        var array = parseArray(cellValue, options.arrayValueSeparator).map(function (_value) {
          if (error) {
            return;
          }
          var result = parseValue(_value, schemaEntry, options);
          if (result.error) {
            // In case of an error, `value` won't be returned and will just be reported
            // as part of an `error` object, so it's fine assigning just an element of the array.
            value = _value;
            error = result.error;
            reason = result.reason;
          }
          return result.value;
        });
        if (!error) {
          var isEmpty = array.every(isEmptyValue);
          value = isEmpty ? options.getEmptyArrayValue(array, {
            path: propertyPath
          }) : array;
        }
      } else {
        var result = parseValue(cellValue, schemaEntry, options);
        error = result.error;
        reason = result.reason;
        value = error ? cellValue : result.value;
      }
    }

    // Apply `required` validation if the value is "empty".
    if (!error && isEmptyValue(value)) {
      if (schemaEntry.required) {
        // Will perform this `required()` validation in the end,
        // when all properties of the mapped object have been mapped.
        pendingRequiredChecks.push({
          column: key,
          value: value,
          isMissingColumn: isMissingColumn
        });
      }
    }
    if (error) {
      // If there was an error then the property value in the `object` will be `undefined`,
      // i.e it won't add the property value to the mapped object.
      errors.push(createError({
        column: key,
        value: value,
        error: error,
        reason: reason
      }));
    } else {
      // Possibly unmark the mapped object as "empty".
      if (isEmptyObject && !isEmptyValue(value)) {
        isEmptyObject = false;
      }
      // Set the value in the mapped object.
      // Skip setting `undefined` values because they're already `undefined`.
      if (value !== undefined) {
        object[schemaEntry.prop] = value;
      }
    }
  };
  for (var _i = 0, _Object$keys = Object.keys(schema); _i < _Object$keys.length; _i++) {
    _loop();
  }

  // Return `null` for an "empty" mapped object.
  if (isEmptyObject) {
    return options.getEmptyObjectValue(object, {
      path: path
    });
  }

  // Perform any `required` validations.
  for (var _i2 = 0, _pendingRequiredCheck = pendingRequiredChecks; _i2 < _pendingRequiredCheck.length; _i2++) {
    var _pendingRequiredCheck2 = _pendingRequiredCheck[_i2],
      column = _pendingRequiredCheck2.column,
      value = _pendingRequiredCheck2.value,
      isMissingColumn = _pendingRequiredCheck2.isMissingColumn;
    // Can optionally skip `required` validation for missing columns.
    var skipRequiredValidation = isMissingColumn && options.schemaPropertyShouldSkipRequiredValidationForMissingColumn(column, {
      object: object
    });
    if (!skipRequiredValidation) {
      var required = schema[column].required;
      var isRequired = typeof required === 'boolean' ? required : required(object);
      if (isRequired) {
        errors.push(createError({
          column: column,
          value: value,
          error: 'required'
        }));
      }
    }
  }

  // Return the mapped object.
  return object;
}

/**
 * Converts textual value to a javascript typed value.
 * @param  {any} value
 * @param  {object} schemaEntry
 * @return {{ value: any, error: string }}
 */
export function parseValue(value, schemaEntry, options) {
  if (value === null) {
    return {
      value: null
    };
  }
  var result;
  if (schemaEntry.parse) {
    result = parseCustomValue(value, schemaEntry.parse);
  } else if (schemaEntry.type) {
    result = parseValueOfType(value,
    // Supports parsing array types.
    // See `parseArray()` function for more details.
    // Example `type`: String[]
    // Input: 'Barack Obama, "String, with, colons", Donald Trump'
    // Output: ['Barack Obama', 'String, with, colons', 'Donald Trump']
    Array.isArray(schemaEntry.type) ? schemaEntry.type[0] : schemaEntry.type, options);
  } else {
    result = {
      value: value
    };
    // throw new Error('Invalid schema entry: no .type and no .parse():\n\n' + JSON.stringify(schemaEntry, null, 2))
  }
  // If errored then return the error.
  if (result.error) {
    return result;
  }
  if (result.value !== null) {
    if (schemaEntry.oneOf && schemaEntry.oneOf.indexOf(result.value) < 0) {
      return {
        error: 'invalid',
        reason: 'unknown'
      };
    }
    if (schemaEntry.validate) {
      try {
        schemaEntry.validate(result.value);
      } catch (error) {
        return {
          error: error.message
        };
      }
    }
  }
  return result;
}

/**
 * Converts textual value to a custom value using supplied `.parse()`.
 * @param  {any} value
 * @param  {function} parse
 * @return {{ value: any, error: string }}
 */
function parseCustomValue(value, parse) {
  try {
    var parsedValue = parse(value);
    if (parsedValue === undefined) {
      return {
        value: null
      };
    }
    return {
      value: parsedValue
    };
  } catch (error) {
    var result = {
      error: error.message
    };
    if (error.reason) {
      result.reason = error.reason;
    }
    return result;
  }
}

/**
 * Converts textual value to a javascript typed value.
 * @param  {any} value
 * @param  {} type
 * @return {{ value: (string|number|Date|boolean), error: string, reason?: string }}
 */
function parseValueOfType(value, type, options) {
  switch (type) {
    case String:
      return parseCustomValue(value, StringType);
    case Number:
      return parseCustomValue(value, NumberType);
    case Date:
      return parseCustomValue(value, function (value) {
        return DateType(value, {
          properties: options.properties
        });
      });
    case Boolean:
      return parseCustomValue(value, BooleanType);
    default:
      if (typeof type === 'function') {
        return parseCustomValue(value, type);
      }
      throw new Error("Unsupported schema type: ".concat(type && type.name || type));
  }
}
export function getBlock(string, endCharacter, startIndex) {
  var i = 0;
  var substring = '';
  var character;
  while (startIndex + i < string.length) {
    var _character = string[startIndex + i];
    if (_character === endCharacter) {
      return [substring, i];
    } else if (_character === '"') {
      var block = getBlock(string, '"', startIndex + i + 1);
      substring += block[0];
      i += '"'.length + block[1] + '"'.length;
    } else {
      substring += _character;
      i++;
    }
  }
  return [substring, i];
}

/**
 * Parses a string of comma-separated substrings into an array of substrings.
 * (the `export` is just for tests)
 * @param  {string} string — A string of comma-separated substrings.
 * @return {string[]} An array of substrings.
 */
export function parseArray(string, arrayValueSeparator) {
  var blocks = [];
  var index = 0;
  while (index < string.length) {
    var _getBlock = getBlock(string, arrayValueSeparator, index),
      _getBlock2 = _slicedToArray(_getBlock, 2),
      substring = _getBlock2[0],
      length = _getBlock2[1];
    index += length + arrayValueSeparator.length;
    blocks.push(substring.trim());
  }
  return blocks;
}

// Transpose a 2D array.
// https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript
var transpose = function transpose(array) {
  return array[0].map(function (_, i) {
    return array.map(function (row) {
      return row[i];
    });
  });
};
function validateSchema(schema) {
  for (var _i3 = 0, _Object$keys2 = Object.keys(schema); _i3 < _Object$keys2.length; _i3++) {
    var key = _Object$keys2[_i3];
    var entry = schema[key];
    if (!entry.prop) {
      throw new Error("\"prop\" not defined for schema entry \"".concat(key, "\"."));
    }
  }
}
function isEmptyValue(value) {
  return value === undefined || value === null;
}
//# sourceMappingURL=mapToObjects.js.map