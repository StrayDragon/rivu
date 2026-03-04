// @vitest-environment jsdom
import { render, screen, act } from '@testing-library/react';
import { expect, test } from 'vitest';

import { createKernel } from 'rivu-kernel';

import { ProtocolInspector } from '../src/index.js';

test('ProtocolInspector renders without Provider and reflects kernel state', () => {
  const kernel = createKernel();

  render(<ProtocolInspector kernel={kernel} />);
  expect(screen.getByText('ProtocolInspector')).toBeTruthy();
  expect(screen.getByText(/"lastSeq": 0/)).toBeTruthy();

  act(() => {
    kernel.dispatch({ seq: 1, event: { type: 'STATE_SNAPSHOT', snapshot: { ui: { v: 1, components: {} } } } });
  });

  expect(screen.getByText(/"lastSeq": 1/)).toBeTruthy();
});

