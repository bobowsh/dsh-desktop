/**
 * Shared schema fragments and cell types for the Office tool suite. Keeping
 * the schemas in one place keeps the seven tool contracts consistent.
 */
/** One cell value accepted by the Excel tools. */
export declare const CELL_VALUE_SCHEMA: {
    readonly oneOf: readonly [{
        readonly type: "string";
    }, {
        readonly type: "number";
    }, {
        readonly type: "boolean";
    }, {
        readonly type: "null";
    }];
};
/** One spreadsheet row. */
export declare const ROW_SCHEMA: {
    readonly type: "array";
    readonly items: {
        readonly oneOf: readonly [{
            readonly type: "string";
        }, {
            readonly type: "number";
        }, {
            readonly type: "boolean";
        }, {
            readonly type: "null";
        }];
    };
};
/** Common success echo for a created/replaced file. */
export declare const FILE_RESULT_SCHEMA: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly path: {
            readonly type: "string";
            readonly required: true;
        };
        readonly sizeBytes: {
            readonly type: "integer";
            readonly required: true;
        };
    };
};
export type CellValue = string | number | boolean | null;
export type CellRow = CellValue[];
