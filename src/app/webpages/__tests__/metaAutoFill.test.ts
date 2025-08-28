import { describe, it, expect } from 'vitest';
import { computeAutoMeta, type TemplateFieldLike } from '../metaAutoFill';

describe('computeAutoMeta', () => {
  const fields: TemplateFieldLike[] = [
    { key: 'title' },
    { key: 'url' },
    { key: 'hostname' },
    { key: 'rating', defaultValue: '3' },
    { key: 'notes', defaultValue: '' },
    { key: 'favicon' },
  ];

  it('fills defaults and derives from page', () => {
    const page = {
      title: 'Example Title',
      url: 'https://example.com/path?a=1',
      favicon: 'https://example.com/favicon.ico',
    };
    const meta = computeAutoMeta({}, fields, page);
    expect(meta.title).toBe('Example Title');
    expect(meta.url).toBe('https://example.com/path?a=1');
    expect(meta.hostname).toBe('example.com');
    expect(meta.rating).toBe('3');
    expect(meta.favicon).toBe('https://example.com/favicon.ico');
  });

  it('does not overwrite existing non-empty values', () => {
    const page = { title: 'T', url: 'https://a.com', favicon: '' };
    const meta = computeAutoMeta({ title: 'Keep', rating: '5' }, fields, page);
    expect(meta.title).toBe('Keep');
    expect(meta.rating).toBe('5');
    // URL normalized by URL() includes trailing slash when no path provided
    expect(meta.url).toBe('https://a.com/');
  });
});
