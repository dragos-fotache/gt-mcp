// T03 QA shared helpers (approved schema/codec spec, black-box only).
//
// SYNTHETIC PROVENANCE: no backend, account or credential data. Helpers assert
// local library behavior through the emitted public entry only.

import { createRequire } from "node:module";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";

export const VALID_CODES = Object.freeze([
  "invalid_arguments",
  "invalid_backend_response",
  "invalid_tool_result",
]);

export function expectCodecError(fn, code) {
  if (!VALID_CODES.includes(code)) throw new Error(`unknown code in test: ${code}`);
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  if (thrown === null) throw new Error(`expected CodecError ${code}, nothing thrown`);
  if (!(thrown instanceof Error)) throw new Error(`expected Error, got ${typeof thrown}`);
  if (thrown.name !== "CodecError" && thrown.constructor?.name !== "CodecError") {
    throw new Error(`expected CodecError instance, got ${thrown.constructor?.name}`);
  }
  if (thrown.code !== code) {
    throw new Error(`expected code ${code}, got ${String(thrown.code)}`);
  }
  return thrown;
}

export function expectSafeMessage(error, forbidden = []) {
  const message = String(error?.message ?? "");
  if (message.length === 0) throw new Error("CodecError message must be nonempty");
  for (const secret of forbidden) {
    if (secret && message.includes(secret)) {
      throw new Error("CodecError message leaks raw input");
    }
  }
}

// Spec section 7 clarification: the SDK default provider is not a guarantee of
// draft2020-12 support. Configure the public AjvJsonSchemaValidator with the
// already-locked SDK-owned Ajv2020 plus ajv-formats, resolved via createRequire
// anchored to the SDK public entry. QA-only use of locked transitive modules;
// no direct dependency, install or manifest change. Strict stylistic mode stays
// off so standards-valid schemas are never rejected for style; dialect/schema
// validation, formats and no-coercion behavior are retained.
const sdkRequire = createRequire(import.meta.resolve("@modelcontextprotocol/sdk/validation/ajv"));
const Ajv2020Module = sdkRequire("ajv/dist/2020");
const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;
const addFormatsModule = sdkRequire("ajv-formats");
const addFormats = addFormatsModule.default ?? addFormatsModule;

export function ajvValidator() {
  const ajv = new Ajv2020({
    allErrors: true,
    validateFormats: true,
    validateSchema: true,
    strict: false,
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,
  });
  addFormats(ajv);
  return new AjvJsonSchemaValidator(ajv);
}

export const DRAFT_2020_12_URI = "https://json-schema.org/draft/2020-12/schema";

const STANDARD_KEYWORDS = new Set([
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "definitions",
  "$anchor",
  "$dynamicRef",
  "$dynamicAnchor",
  "$recursiveRef",
  "$recursiveAnchor",
  "$comment",
  "$vocabulary",
  "title",
  "description",
  "type",
  "properties",
  "required",
  "additionalProperties",
  "patternProperties",
  "items",
  "minItems",
  "maxItems",
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "enum",
  "const",
  "anyOf",
  "oneOf",
  "allOf",
  "not",
  "if",
  "then",
  "else",
  "dependentRequired",
  "dependentSchemas",
  "dependencies",
  "propertyNames",
  "contains",
  "minContains",
  "maxContains",
  "unevaluatedProperties",
  "unevaluatedItems",
  "prefixItems",
  "additionalItems",
  "uniqueItems",
  "default",
  "examples",
  "example",
  "readOnly",
  "writeOnly",
  "deprecated",
  "contentMediaType",
  "contentEncoding",
  "contentSchema",
]);

// Keyword-map containers whose VALUES are subschemas (names inside are data).
const SUBSCHEMA_MAP_KEYS = new Set([
  "properties",
  "$defs",
  "definitions",
  "dependentSchemas",
  "patternProperties",
]);

// Keywords whose single OBJECT value is a subschema (booleans are data).
const SUBSCHEMA_SINGLE_KEYS = new Set([
  "items",
  "additionalProperties",
  "unevaluatedItems",
  "unevaluatedProperties",
  "contains",
  "propertyNames",
  "contentSchema",
  "not",
  "if",
  "then",
  "else",
]);

// Keywords whose ARRAY value holds subschemas.
const SUBSCHEMA_ARRAY_KEYS = new Set(["anyOf", "oneOf", "allOf", "prefixItems"]);

// Schema-aware traversal: visits schema nodes only. Property/definition names
// and literal annotation/default/example objects are data, never keywords.
export function visitSchemaNodes(root, onNode) {
  const visit = (node, path) => {
    if (node === null || typeof node !== "object" || Array.isArray(node)) return;
    onNode(node, path);
    for (const key of SUBSCHEMA_MAP_KEYS) {
      const group = node[key];
      if (group !== null && typeof group === "object" && !Array.isArray(group)) {
        for (const [name, sub] of Object.entries(group)) visit(sub, `${path}.${key}.${name}`);
      }
    }
    for (const key of SUBSCHEMA_SINGLE_KEYS) {
      const sub = node[key];
      if (sub !== null && typeof sub === "object" && !Array.isArray(sub)) {
        visit(sub, `${path}.${key}`);
      }
    }
    for (const key of SUBSCHEMA_ARRAY_KEYS) {
      const members = node[key];
      if (Array.isArray(members))
        members.forEach((sub, index) => visit(sub, `${path}.${key}[${index}]`));
    }
    if (Array.isArray(node.items)) {
      node.items.forEach((sub, index) => visit(sub, `${path}.items[${index}]`));
    }
  };
  visit(root, "$");
}

export function collectRefs(schema) {
  const refs = [];
  visitSchemaNodes(schema, (node, path) => {
    if (typeof node.$ref === "string") refs.push({ ref: node.$ref, path });
  });
  return refs;
}

export function collectSchemaUris(schema) {
  const uris = [];
  visitSchemaNodes(schema, (node, path) => {
    if (typeof node.$schema === "string") uris.push({ uri: node.$schema, path });
  });
  return uris;
}

export function collectNonstandardKeywords(schema) {
  const bad = [];
  visitSchemaNodes(schema, (node, path) => {
    for (const key of Object.keys(node)) {
      if (!STANDARD_KEYWORDS.has(key)) bad.push({ key, path });
    }
  });
  return bad;
}
