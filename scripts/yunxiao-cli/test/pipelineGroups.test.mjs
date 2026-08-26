import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPipelineGroupFunc,
  joinPipelineGroupFunc,
  listPipelineGroupsFunc,
} from '../dist/operations/flow/pipeline.js';
import { getAllTools } from '../dist/tool-registry/index.js';
import { handleToolRequest } from '../dist/tool-handlers/index.js';

async function withMockedFetch(responseBody, callback) {
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.YUNXIAO_ACCESS_TOKEN;
  const previousBaseUrl = process.env.YUNXIAO_API_BASE_URL;
  let capturedRequest;

  process.env.YUNXIAO_ACCESS_TOKEN = 'test-token';
  delete process.env.YUNXIAO_API_BASE_URL;
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    return await callback(() => capturedRequest);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.YUNXIAO_ACCESS_TOKEN;
    else process.env.YUNXIAO_ACCESS_TOKEN = previousToken;
    if (previousBaseUrl === undefined) delete process.env.YUNXIAO_API_BASE_URL;
    else process.env.YUNXIAO_API_BASE_URL = previousBaseUrl;
  }
}

test('pipeline group tools are registered', () => {
  const names = new Set(getAllTools().map(({ name }) => name));
  assert.ok(names.has('list_pipeline_groups'));
  assert.ok(names.has('get_pipeline_group'));
  assert.ok(names.has('join_pipeline_group'));
});

test('listPipelineGroupsFunc sends the documented central-edition request', async () => {
  await withMockedFetch([{ id: 146337, name: 'cogfoundry-web' }], async (getRequest) => {
    const result = await listPipelineGroupsFunc('org-example', { maxResults: 50 });
    assert.deepEqual(result, [{ id: 146337, name: 'cogfoundry-web' }]);
    assert.equal(
      getRequest().url,
      'https://openapi-rdc.aliyuncs.com/oapi/v1/flow/organizations/org-example/pipelineGroups?maxResults=50',
    );
    assert.equal(getRequest().options.method, 'GET');
  });
});

test('getPipelineGroupFunc addresses the exact numeric group', async () => {
  await withMockedFetch({ id: 146337, name: 'cogfoundry-web' }, async (getRequest) => {
    const result = await getPipelineGroupFunc('org-example', 146337);
    assert.equal(result.id, 146337);
    assert.equal(
      getRequest().url,
      'https://openapi-rdc.aliyuncs.com/oapi/v1/flow/organizations/org-example/pipelineGroups/146337',
    );
  });
});

test('join pipeline group handler encodes exact pipeline IDs and group ID', async () => {
  await withMockedFetch(true, async (getRequest) => {
    const handled = await handleToolRequest({
      params: {
        name: 'join_pipeline_group',
        arguments: {
          organizationId: 'org-example',
          groupId: 146337,
          pipelineIds: [5168245, '5168246'],
        },
      },
    });
    assert.deepEqual(JSON.parse(handled.content[0].text), { success: true });
    assert.equal(
      getRequest().url,
      'https://openapi-rdc.aliyuncs.com/oapi/v1/flow/organizations/org-example/pipelineGroups/join?pipelineIds=5168245%2C5168246&groupId=146337',
    );
    assert.equal(getRequest().options.method, 'POST');
    assert.equal(getRequest().options.body, undefined);
  });
});

test('joinPipelineGroupFunc supports groupId=0 for ungrouping', async () => {
  await withMockedFetch(true, async (getRequest) => {
    await joinPipelineGroupFunc('org-example', 0, ['5168245']);
    assert.match(getRequest().url, /groupId=0$/);
  });
});
