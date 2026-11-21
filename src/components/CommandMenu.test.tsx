import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CommandMenu from './CommandMenu';

const contact = { email: 'a@b.co', linkedin: 'https://l/in' };

describe('CommandMenu (closed, as server-rendered)', () => {
  const html = renderToStaticMarkup(<CommandMenu contact={contact} />);

  it('renders only the pill, labelled and with the shortcut', () => {
    expect(html).toContain('aria-label="Open command menu"');
    expect(html).toContain('⌘K');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain('role="dialog"');
  });
});
