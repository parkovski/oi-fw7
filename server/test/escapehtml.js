import { test, expect } from 'vitest';
import escapeHtml from '@/util/escapehtml';

test('escape html', () => {
  const html = 'text<br>&pound;\r\nnewline';
  const expected = 'text&lt;br&gt;&pound;<br>newline';

  expect(escapeHtml(html)).toBe(expected);
});
