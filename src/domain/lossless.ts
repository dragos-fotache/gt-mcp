/**
 * Lossless wire-JSON parsing. An internal recursive-descent parser preserves
 * every original number token alongside its rounded value, rejects duplicate
 * object keys, malformed JSON and trailing content, and never converts through
 * float before integrality/range checks. Numbers surface as JsonNumber boxes;
 * converters unbox known positions exactly and preserve unknown convenience
 * numbers as plain parsed values.
 */
import { CodecError } from "./errors.js";
import { setOwn } from "./clone.js";

/** A parsed JSON number with its exact original token text. */
export class JsonNumber {
  readonly value: number;
  readonly token: string;

  constructor(value: number, token: string) {
    this.value = value;
    this.token = token;
  }
}

type ParsedValue =
  null | boolean | string | JsonNumber | ParsedValue[] | { [key: string]: ParsedValue };

const NUMBER_START = new Set(["-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
const NUMBER_PATTERN = new RegExp("^-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][+-]?[0-9]+)?");

function invalid(): CodecError {
  return new CodecError("invalid_backend_response", "Invalid backend response.");
}

class Parser {
  private index = 0;
  constructor(private readonly text: string) {}

  parse(): ParsedValue {
    this.skipWhitespace();
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.index !== this.text.length) {
      throw invalid();
    }
    return value;
  }

  private peek(): string {
    return this.text[this.index] ?? "";
  }

  private skipWhitespace(): void {
    while (
      this.index < this.text.length &&
      (this.text[this.index] === " " ||
        this.text[this.index] === "\t" ||
        this.text[this.index] === "\n" ||
        this.text[this.index] === "\r")
    ) {
      this.index += 1;
    }
  }

  private parseValue(): ParsedValue {
    const char = this.peek();
    if (char === "{") {
      return this.parseObject();
    }
    if (char === "[") {
      return this.parseArray();
    }
    if (char === '"') {
      return this.parseString();
    }
    if (char === "t") {
      this.expectLiteral("true");
      return true;
    }
    if (char === "f") {
      this.expectLiteral("false");
      return false;
    }
    if (char === "n") {
      this.expectLiteral("null");
      return null;
    }
    if (NUMBER_START.has(char)) {
      return this.parseNumber();
    }
    throw invalid();
  }

  private expectLiteral(literal: string): void {
    if (this.text.startsWith(literal, this.index)) {
      this.index += literal.length;
      return;
    }
    throw invalid();
  }

  private parseObject(): { [key: string]: ParsedValue } {
    this.index += 1;
    const out: { [key: string]: ParsedValue } = {};
    const seen = new Set<string>();
    this.skipWhitespace();
    if (this.peek() === "}") {
      this.index += 1;
      return out;
    }
    for (;;) {
      this.skipWhitespace();
      if (this.peek() !== '"') {
        throw invalid();
      }
      const key = this.parseString();
      if (seen.has(key)) {
        throw invalid();
      }
      seen.add(key);
      this.skipWhitespace();
      if (this.peek() !== ":") {
        throw invalid();
      }
      this.index += 1;
      this.skipWhitespace();
      setOwn(out, key, this.parseValue());
      this.skipWhitespace();
      const next = this.peek();
      if (next === ",") {
        this.index += 1;
        continue;
      }
      if (next === "}") {
        this.index += 1;
        return out;
      }
      throw invalid();
    }
  }

  private parseArray(): ParsedValue[] {
    this.index += 1;
    const out: ParsedValue[] = [];
    this.skipWhitespace();
    if (this.peek() === "]") {
      this.index += 1;
      return out;
    }
    for (;;) {
      this.skipWhitespace();
      out.push(this.parseValue());
      this.skipWhitespace();
      const next = this.peek();
      if (next === ",") {
        this.index += 1;
        continue;
      }
      if (next === "]") {
        this.index += 1;
        return out;
      }
      throw invalid();
    }
  }

  private parseString(): string {
    this.index += 1;
    let out = "";
    for (;;) {
      if (this.index >= this.text.length) {
        throw invalid();
      }
      const char = this.text[this.index] ?? "";
      if (char === '"') {
        this.index += 1;
        return out;
      }
      if (char === "\\") {
        out += this.parseEscape();
        continue;
      }
      const code = char.codePointAt(0) ?? 0;
      if (code < 0x20) {
        throw invalid();
      }
      out += char;
      this.index += char.length;
    }
  }

  private parseEscape(): string {
    const esc = this.text[this.index + 1] ?? "";
    switch (esc) {
      case '"':
      case "\\":
      case "/":
        this.index += 2;
        return esc;
      case "b":
        this.index += 2;
        return "\b";
      case "f":
        this.index += 2;
        return "\f";
      case "n":
        this.index += 2;
        return "\n";
      case "r":
        this.index += 2;
        return "\r";
      case "t":
        this.index += 2;
        return "\t";
      case "u": {
        const hex = this.text.slice(this.index + 2, this.index + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          throw invalid();
        }
        this.index += 6;
        // Ordinary JSON code-unit semantics: each escape is one code unit
        // with no extra surrogate-pairing restrictions.
        return String.fromCharCode(Number.parseInt(hex, 16));
      }
      default:
        throw invalid();
    }
  }

  private parseNumber(): JsonNumber {
    const rest = this.text.slice(this.index);
    const match = NUMBER_PATTERN.exec(rest);
    if (match === null) {
      throw invalid();
    }
    const token = match[0];
    this.index += token.length;
    return new JsonNumber(Number(token), token);
  }
}

/**
 * Parse backend success-data JSON with exact number tokens and mandatory
 * duplicate-key rejection. Throws invalid_backend_response on any malformed,
 * trailing or structurally unusable content.
 */
export function parseLosslessJson(rawJson: string): unknown {
  if (typeof rawJson !== "string") {
    throw invalid();
  }
  return new Parser(rawJson).parse();
}

/**
 * Unbox unknown convenience numbers to plain values when preserving them.
 * Non-finite wire numbers (for example `1e999`) cannot survive JSON
 * serialization (they would silently become null), so they are rejected
 * instead of preserved.
 */
export function toPlainJson(value: unknown): unknown {
  if (value instanceof JsonNumber) {
    if (!Number.isFinite(value.value)) {
      throw invalid();
    }
    return value.value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toPlainJson(item));
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      setOwn(out, key, toPlainJson(record[key]));
    }
    return out;
  }
  return value;
}
