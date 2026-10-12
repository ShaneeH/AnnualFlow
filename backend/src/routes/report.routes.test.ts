import assert from "node:assert/strict";
import test from "node:test";

import OpenAI from "openai";

import { DuplicateDocumentError } from "../services/documents.service";
import { NotFinancialReportError, ServiceConfigError } from "../utils/errors";
import { uploadErrorResponse } from "./report.routes";

test("non-financial documents map to 422 NOT_FINANCIAL_REPORT", () => {
    const { status, body } = uploadErrorResponse(new NotFinancialReportError("CV detected."));
    assert.equal(status, 422);
    assert.equal(body.code, "NOT_FINANCIAL_REPORT");
    assert.equal(body.error, "CV detected.");
});

test("duplicates, missing key and OpenAI errors get specific messages", () => {
    assert.equal(uploadErrorResponse(new DuplicateDocumentError()).status, 409);
    assert.match(uploadErrorResponse(new ServiceConfigError("x")).body.error, /OPENAI_API_KEY/);

    const auth = OpenAI.APIError.generate(401, { error: { message: "bad key" } }, undefined, new Headers());
    assert.equal(uploadErrorResponse(auth).status, 503);
});

test("only truly unknown errors fall back to a generic 500", () => {
    const { status, body } = uploadErrorResponse(new TypeError("x is undefined"));
    assert.equal(status, 500);
    assert.match(body.error, /unexpected server error/);
});
