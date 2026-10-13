import assert from "node:assert/strict";
import test from "node:test";

import { aiInsightSchema } from "./insight-schema";
import { financialReportSchema } from "./report-schema";

// Keywords OpenAI Structured Outputs (strict: true) accepts.
const SUPPORTED = new Set([
    "type", "properties", "required", "additionalProperties", "items", "enum",
    "anyOf", "pattern", "format", "minItems", "maxItems", "minimum", "maximum",
    "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "description", "const",
    "$defs", "$ref"
]);

/** Returns every strict-mode rule violation found in the schema. */
function strictViolations(node: unknown, path = "$"): string[] {
    if (!node || typeof node !== "object") return [];
    const schema = node as Record<string, any>;
    const problems: string[] = [];

    for (const key of Object.keys(schema)) {
        if (!SUPPORTED.has(key)) problems.push(`${path}: unsupported keyword '${key}'`);
    }

    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (types.includes("object")) {
        if (schema.additionalProperties !== false) {
            problems.push(`${path}: additionalProperties must be false`);
        }
        const keys = Object.keys(schema.properties ?? {});
        const required: string[] = schema.required ?? [];
        for (const key of keys) {
            if (!required.includes(key)) problems.push(`${path}.${key}: must be required`);
        }
    }

    if (typeof schema.pattern === "string" && /\(\?[=!<]/.test(schema.pattern)) {
        problems.push(`${path}: lookaround in pattern`);
    }

    for (const [key, child] of Object.entries(schema.properties ?? {})) {
        problems.push(...strictViolations(child, `${path}.${key}`));
    }
    if (schema.items) problems.push(...strictViolations(schema.items, `${path}[]`));
    (schema.anyOf ?? []).forEach((child: unknown, index: number) =>
        problems.push(...strictViolations(child, `${path}|${index}`)));

    return problems;
}

test("the report extraction schema satisfies OpenAI strict mode", () => {
    assert.deepEqual(strictViolations(financialReportSchema), []);
    assert.equal((financialReportSchema as any).type, "object");
});

test("the AI insight schema satisfies OpenAI strict mode", () => {
    assert.deepEqual(strictViolations(aiInsightSchema), []);
});

test("the checker catches a non-required property", () => {
    assert.notDeepEqual(strictViolations({
        type: "object",
        additionalProperties: false,
        required: [],
        properties: { a: { type: "string" } }
    }), []);
});
