import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import test from "node:test";

import { NotFinancialReportError } from "../utils/errors";
import { cvLikeOutput } from "../utils/test-fixtures";

// End-to-end through the real openai.service against a local fake OpenAI API.
// Proves the exact request we send, and how real OpenAI responses/errors are handled.

interface FakeReply { status: number; body: unknown }

async function withFakeOpenAI(
    reply: FakeReply,
    run: (requests: Array<{ url: string; body: string }>) => Promise<void>
) {
    const requests: Array<{ url: string; body: string }> = [];
    const server: Server = createServer((req, res) => {
        let body = "";
        req.on("data", chunk => (body += chunk));
        req.on("end", () => {
            requests.push({ url: `${req.method} ${req.url}`, body });
            res.setHeader("content-type", "application/json");

            if (req.url?.startsWith("/v1/files") && req.method === "POST") {
                res.end(JSON.stringify({ id: "file-fake", object: "file" }));
            } else if (req.method === "DELETE") {
                res.end(JSON.stringify({ id: "file-fake", deleted: true }));
            } else {
                res.statusCode = reply.status;
                res.end(JSON.stringify(reply.body));
            }
        });
    });

    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    const previous = { key: process.env.OPENAI_API_KEY, url: process.env.OPENAI_BASE_URL };
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_BASE_URL = `http://127.0.0.1:${port}/v1`;

    try {
        await run(requests);
    } finally {
        process.env.OPENAI_API_KEY = previous.key;
        process.env.OPENAI_BASE_URL = previous.url;
        server.close();
    }
}

function responseWith(text: string) {
    return {
        id: "resp_1",
        object: "response",
        status: "completed",
        output: [{
            type: "message",
            id: "msg_1",
            status: "completed",
            role: "assistant",
            content: [{ type: "output_text", text, annotations: [] }]
        }]
    };
}

async function upload() {
    // Fresh module instances so the OpenAI client picks up the fake base URL.
    for (const key of Object.keys(require.cache)) {
        if (/openai\.service|report-processing\.service/.test(key)) delete require.cache[key];
    }
    const openai = require("./openai.service") as typeof import("./openai.service");
    const { processReportUpload } =
        require("./report-processing.service") as typeof import("./report-processing.service");
    let saved = 0;

    const promise = processReportUpload(Buffer.from("%PDF-1.4 cv %%EOF"), "cv.pdf", 1, {
        documentExistsByHash: async () => false,
        uploadPDF: openai.uploadPDF,
        analysePDF: openai.analysePDF,
        deletePDF: openai.deletePDF,
        saveFinancialDocument: async () => {
            saved += 1;
            return { documentId: 1, conflicts: [] };
        }
    });

    return { promise, saved: () => saved };
}

test("a CV classified by OpenAI is rejected as NOT_FINANCIAL_REPORT and the file is deleted", async () => {
    await withFakeOpenAI({ status: 200, body: responseWith(cvLikeOutput) }, async requests => {
        const { promise, saved } = await upload();

        await assert.rejects(promise, NotFinancialReportError);
        assert.equal(saved(), 0);
        assert.ok(requests.some(r => r.url.startsWith("DELETE /v1/files/file-fake")));

        const sent = JSON.parse(requests.find(r => r.url.startsWith("POST /v1/responses"))!.body);
        assert.equal(sent.text.format.type, "json_schema");
        assert.equal(sent.text.format.strict, true);
        assert.ok(sent.text.format.schema.required.includes("classification"));
    });
});

test("an OpenAI 400 is surfaced (not swallowed) and the file is still deleted", async () => {
    const { uploadErrorResponse } = await import("../routes/report.routes");

    await withFakeOpenAI({
        status: 400,
        body: {
            error: {
                message: "Invalid schema for response_format 'financial_report'.",
                type: "invalid_request_error",
                param: "text.format.schema",
                code: "invalid_json_schema"
            }
        }
    }, async requests => {
        const { promise } = await upload();
        const error = await promise.then(() => null, e => e);

        const { status, body } = uploadErrorResponse(error);
        assert.equal(status, 502);
        assert.match(body.error, /Invalid schema for response_format/);
        assert.ok(requests.some(r => r.url.startsWith("DELETE /v1/files/file-fake")));
    });
});

test("an incomplete (token-limited) response gives a specific message", async () => {
    await withFakeOpenAI({
        status: 200,
        body: { ...responseWith(""), status: "incomplete", incomplete_details: { reason: "max_output_tokens" } }
    }, async () => {
        const { promise } = await upload();
        await assert.rejects(promise, /stopped before finishing \(max_output_tokens\)/);
    });
});
