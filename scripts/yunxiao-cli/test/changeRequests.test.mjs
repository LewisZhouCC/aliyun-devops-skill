import test from 'node:test';
import assert from 'node:assert/strict';

import { closeChangeRequestFunc, createChangeRequestFunc } from '../dist/operations/codeup/changeRequests.js';
import {
  CloseChangeRequestResponseSchema,
  CloseChangeRequestSchema,
  CreateChangeRequestSchema,
} from '../dist/operations/codeup/types.js';
import { getAllTools } from '../dist/tool-registry/index.js';
import { handleToolRequest } from '../dist/tool-handlers/index.js';

const baseRequest = {
  organizationId: 'org-example',
  repositoryId: '123456',
  title: 'Review this change',
  sourceBranch: 'fix/example',
  targetBranch: 'main',
};

test('WEB change request does not require sourceCommitId', () => {
  const parsed = CreateChangeRequestSchema.parse(baseRequest);

  assert.equal(parsed.createFrom, 'WEB');
  assert.equal(parsed.sourceCommitId, undefined);
});

test('COMMAND_LINE change request rejects a missing sourceCommitId', () => {
  assert.throws(
    () => CreateChangeRequestSchema.parse({ ...baseRequest, createFrom: 'COMMAND_LINE' }),
    /sourceCommitId is required when createFrom=COMMAND_LINE/,
  );
});

test('COMMAND_LINE change request accepts an explicit sourceCommitId', () => {
  const parsed = CreateChangeRequestSchema.parse({
    ...baseRequest,
    createFrom: 'COMMAND_LINE',
    sourceCommitId: '0123456789abcdef0123456789abcdef01234567',
  });

  assert.equal(parsed.sourceCommitId, '0123456789abcdef0123456789abcdef01234567');
});

test('COMMAND_LINE change request sends sourceCommitId to Yunxiao', async () => {
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.YUNXIAO_ACCESS_TOKEN;
  let requestBody;

  process.env.YUNXIAO_ACCESS_TOKEN = 'test-token';
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    await createChangeRequestFunc(
      'org-example',
      '123456',
      'Review this change',
      'fix/example',
      'main',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'COMMAND_LINE',
      false,
      '0123456789abcdef0123456789abcdef01234567',
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) {
      delete process.env.YUNXIAO_ACCESS_TOKEN;
    } else {
      process.env.YUNXIAO_ACCESS_TOKEN = previousToken;
    }
  }

  assert.equal(requestBody.createFrom, 'COMMAND_LINE');
  assert.equal(requestBody.sourceCommitId, '0123456789abcdef0123456789abcdef01234567');
});

test('close_change_request is registered and the handler sends the central-edition request', async () => {
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.YUNXIAO_ACCESS_TOKEN;
  const previousBaseUrl = process.env.YUNXIAO_API_BASE_URL;
  let capturedRequest;

  process.env.YUNXIAO_ACCESS_TOKEN = 'test-token';
  delete process.env.YUNXIAO_API_BASE_URL;
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return new Response(JSON.stringify({ result: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const tool = getAllTools().find(({ name }) => name === 'close_change_request');
    assert.ok(tool, 'close_change_request should be discoverable in the registry');
    assert.deepEqual(tool.inputSchema.required.sort(), ['localId', 'repositoryId']);

    const handled = await handleToolRequest({
      params: {
        name: 'close_change_request',
        arguments: {
          organizationId: 'org-example',
          repositoryId: 'org-example/nested group/repository',
          localId: '7',
        },
      },
    });

    assert.deepEqual(JSON.parse(handled.content[0].text), { result: true });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.YUNXIAO_ACCESS_TOKEN;
    else process.env.YUNXIAO_ACCESS_TOKEN = previousToken;
    if (previousBaseUrl === undefined) delete process.env.YUNXIAO_API_BASE_URL;
    else process.env.YUNXIAO_API_BASE_URL = previousBaseUrl;
  }

  assert.equal(
    capturedRequest.url,
    'https://openapi-rdc.aliyuncs.com/oapi/v1/codeup/organizations/org-example/repositories/org-example%2Fnested%20group%2Frepository/changeRequests/7/close',
  );
  assert.equal(capturedRequest.options.method, 'POST');
  assert.equal(capturedRequest.options.body, undefined);
});

test('closeChangeRequestFunc sends the Region-edition request without organizationId', async () => {
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.YUNXIAO_ACCESS_TOKEN;
  const previousBaseUrl = process.env.YUNXIAO_API_BASE_URL;
  let capturedRequest;

  process.env.YUNXIAO_ACCESS_TOKEN = 'test-token';
  process.env.YUNXIAO_API_BASE_URL = 'https://yunxiao.example.com';
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return new Response(JSON.stringify({ result: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const parsed = CloseChangeRequestSchema.parse({
      repositoryId: 'org-example%2Fnested%2Frepository',
      localId: 8,
    });
    assert.equal(parsed.organizationId, 'default');

    const result = await closeChangeRequestFunc(
      parsed.organizationId,
      parsed.repositoryId,
      parsed.localId,
    );
    assert.deepEqual(result, { result: false });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.YUNXIAO_ACCESS_TOKEN;
    else process.env.YUNXIAO_ACCESS_TOKEN = previousToken;
    if (previousBaseUrl === undefined) delete process.env.YUNXIAO_API_BASE_URL;
    else process.env.YUNXIAO_API_BASE_URL = previousBaseUrl;
  }

  assert.equal(
    capturedRequest.url,
    'https://yunxiao.example.com/oapi/v1/codeup/repositories/org-example%2Fnested%2Frepository/changeRequests/8/close',
  );
  assert.equal(capturedRequest.options.method, 'POST');
  assert.equal(capturedRequest.options.body, undefined);
});

test('close change request schemas reject invalid IDs and invalid responses', () => {
  assert.throws(
    () => CloseChangeRequestSchema.parse({ repositoryId: '123456', localId: '0' }),
    /localId must be a positive integer/,
  );
  assert.throws(
    () => CloseChangeRequestResponseSchema.parse({ result: 'true' }),
    /Expected boolean/,
  );
});
