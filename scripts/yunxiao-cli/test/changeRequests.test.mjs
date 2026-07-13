import test from 'node:test';
import assert from 'node:assert/strict';

import { createChangeRequestFunc } from '../dist/operations/codeup/changeRequests.js';
import { CreateChangeRequestSchema } from '../dist/operations/codeup/types.js';

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
