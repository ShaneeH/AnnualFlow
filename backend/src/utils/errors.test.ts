import assert from "node:assert/strict";
import test from "node:test";

import OpenAI from "openai";

import { describeError, logServerError, toUpstreamAppError } from "./errors";

function apiError(status: number, body: Record<string, unknown>) {
    return OpenAI.APIError.generate(
        status,
        { error: body },
        undefined,
        new Headers({ "x-request-id": "req_openai_123" })
    );
}

test("OpenAI 400 (e.g. invalid JSON schema) becomes 502 with the upstream message", () => {
    const error = apiError(400, {
        message: "Invalid schema for response_format 'financial_report'",
        type: "invalid_request_error",
        param: "text.format.schema",
        code: "invalid_json_schema"
    });
    const mapped = toUpstreamAppError(error);

    assert.equal(mapped?.status, 502);
    assert.match(mapped!.message, /rejected the request/);
    assert.match(mapped!.message, /Invalid schema/);
});

test("maps auth, permission, model-not-found, quota, connection and timeout errors", () => {
    assert.equal(toUpstreamAppError(apiError(401, { message: "Incorrect API key" }))?.status, 503);
    assert.match(
        toUpstreamAppError(apiError(401, { message: "x" }))!.message,
        /OPENAI_API_KEY/
    );
    assert.equal(toUpstreamAppError(apiError(403, { message: "no access" }))?.status, 503);
    assert.match(
        toUpstreamAppError(apiError(404, { message: "The model `gpt-5` does not exist" }))!.message,
        /OPENAI_MODEL/
    );
    assert.match(
        toUpstreamAppError(apiError(429, { message: "quota", code: "insufficient_quota" }))!.message,
        /quota/
    );
    assert.equal(toUpstreamAppError(apiError(429, { message: "slow down" }))?.status, 429);
    assert.equal(toUpstreamAppError(apiError(500, { message: "boom" }))?.status, 502);
    assert.equal(
        toUpstreamAppError(new OpenAI.APIConnectionError({ message: "ECONNRESET" }))?.status,
        502
    );
    assert.equal(toUpstreamAppError(new OpenAI.APIConnectionTimeoutError())?.status, 504);
});

test("maps missing tables and database outages to actionable 503s", () => {
    const missingTable = Object.assign(new Error('relation "ai_insights" does not exist'), { code: "42P01" });
    const refused = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" });

    assert.match(toUpstreamAppError(missingTable)!.message, /db:migrate/);
    assert.match(toUpstreamAppError(refused)!.message, /DATABASE_URL/);
    assert.equal(toUpstreamAppError(new Error("something else")), null);
});

test("logServerError prints the request ID and the OpenAI error details", () => {
    const lines: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => { lines.push(args.join(" ")); };

    try {
        logServerError("reports", "req-42", apiError(400, {
            message: "Unsupported parameter: 'text.verbosity'",
            param: "text.verbosity",
            code: "unsupported_parameter"
        }));
    } finally {
        console.error = original;
    }

    const output = lines.join("\n");
    assert.match(output, /request=req-42/);
    assert.match(output, /"status": 400/);
    assert.match(output, /unsupported_parameter/);
    assert.match(output, /text\.verbosity/);
    assert.match(output, /req_openai_123/);
});

test("describeError keeps database error codes", () => {
    const details = describeError(Object.assign(new Error("bad"), { code: "23505" }));
    assert.equal(details.code, "23505");
});
