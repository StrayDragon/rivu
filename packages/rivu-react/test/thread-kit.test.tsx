// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { createKernel } from 'rivu-kernel';

import { ToolCallCard, ToolResultCard, ThreadView, createRegistry, viewerRegistryV1, workflowRegistryV1 } from '../src/index.js';

afterEach(() => cleanup());

test('ToolCallCard degrades gracefully when toolCall is missing', () => {
  const kernel = createKernel();
  render(<ToolCallCard kernel={kernel} toolCallId="missing_tool_call" />);
  expect(screen.getByText('(missing tool call)')).toBeTruthy();
  expect(screen.getByText('missing')).toBeTruthy();
});

test('ToolResultCard degrades gracefully when result is missing', () => {
  const kernel = createKernel();
  kernel.dispatch({ seq: 1, event: { type: 'TOOL_CALL_START', toolCallId: 'tool_1', toolCallName: 'search', parentMessageId: 'msg_parent' } });
  render(<ToolResultCard kernel={kernel} toolCallId="tool_1" />);
  expect(screen.getByText('search result')).toBeTruthy();
  expect(screen.getByText('(no result yet)')).toBeTruthy();
});

test('ThreadView renders messages, tool cards, and mounts without crashing', () => {
  const kernel = createKernel();
  const registry = createRegistry({ ...viewerRegistryV1, ...workflowRegistryV1 });

  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_unknown: {
              type: 'NotRegistered',
              schemaVersion: 1,
              props: { title: 'Unknown component (test)' },
              revision: 0,
              mounts: [{ messageId: 'msg_1', slot: 'inline', order: 0 }],
            },
          },
        },
      },
    },
  });

  kernel.dispatch({ seq: 2, event: { type: 'TEXT_MESSAGE_START', messageId: 'msg_1', role: 'assistant' } });
  kernel.dispatch({ seq: 3, event: { type: 'TEXT_MESSAGE_CHUNK', messageId: 'msg_1', role: 'assistant', delta: 'Hello' } });
  kernel.dispatch({ seq: 4, event: { type: 'TEXT_MESSAGE_END', messageId: 'msg_1' } });

  kernel.dispatch({ seq: 5, event: { type: 'TOOL_CALL_START', toolCallId: 'tool_call_1', toolCallName: 'getRevenue', parentMessageId: 'msg_1' } });
  kernel.dispatch({ seq: 6, event: { type: 'TOOL_CALL_ARGS', toolCallId: 'tool_call_1', delta: '{\"region\":\"NA\"}' } });
  kernel.dispatch({ seq: 7, event: { type: 'TOOL_CALL_END', toolCallId: 'tool_call_1' } });
  kernel.dispatch({ seq: 8, event: { type: 'TOOL_CALL_RESULT', messageId: 'msg_tool_1', toolCallId: 'tool_call_1', content: '{\"ok\":true}' } });

  kernel.dispatch({ seq: 9, event: { type: 'TOOL_CALL_START', toolCallId: 'tool_stream', toolCallName: 'searchDocs', parentMessageId: 'msg_1' } });
  kernel.dispatch({ seq: 10, event: { type: 'TOOL_CALL_ARGS', toolCallId: 'tool_stream', delta: '{\"q\":\"Thread\"' } });

  render(<ThreadView kernel={kernel} registry={registry} sidebar />);

  expect(screen.getByText(/lastSeq/)).toBeTruthy();
  expect(screen.getByText('Hello')).toBeTruthy();
  expect(screen.getByText('getRevenue')).toBeTruthy();
  expect(screen.getByText('getRevenue result')).toBeTruthy();
  expect(screen.getByText('{\"ok\":true}')).toBeTruthy();
  expect(screen.getByText('searchDocs')).toBeTruthy();
  expect(screen.getByText('(no result yet)')).toBeTruthy();
});
