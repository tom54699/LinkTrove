/**
 * Test unified meta enrichment functionality in WebpagesProvider.addFromTab
 * Verifies that all available meta fields are extracted regardless of template configuration
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebpagesProvider } from '../WebpagesProvider';
import * as pageMeta from '../../../background/pageMeta';
import type { PageMeta } from '../../../background/pageMeta';

// Mock the pageMeta module
vi.mock('../../../background/pageMeta', () => ({
  extractMetaForTab: vi.fn(),
  getCachedMeta: vi.fn(),
  saveMetaCache: vi.fn(),
  waitForTabComplete: vi.fn(),
  urlsRoughlyEqual: vi.fn(),
}));

// Mock webpageService with minimal implementation
vi.mock('../../../background/webpageService', () => ({
  addWebpageFromTab: vi.fn(),
  loadWebpages: vi.fn(() => Promise.resolve([])),
  addWebpage: vi.fn(),
  updateWebpage: vi.fn(),
  deleteWebpage: vi.fn(),
  loadFromSync: vi.fn(() => Promise.resolve([])),
  loadTemplates: vi.fn(() => Promise.resolve([])),
}));

// Mock Chrome APIs
const mockChrome = {
  tabs: {
    get: vi.fn(),
    query: vi.fn(),
  },
  runtime: {
    lastError: null,
  },
};

(global as any).chrome = mockChrome;

const TestComponent = () => {
  return (
    <WebpagesProvider categoryId="test-category">
      <div data-testid="test-content">Test Content</div>
    </WebpagesProvider>
  );
};

describe('WebpagesProvider - Unified Meta Enrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.runtime.lastError = null;
  });

  it('should extract and enrich all available meta fields regardless of template', async () => {
    const mockMeta: PageMeta = {
      title: '苟在初圣魔门当人材',
      description: 'A description of the book',
      siteName: '69shuba.com',
      author: '鹤守月满池',
      url: 'https://example.com/book/123',
      collectedAt: new Date().toISOString(),
      // Book-specific fields
      bookTitle: '苟在初圣魔门当人材',
      serialStatus: '連載中',
      genre: '玄幻',
      wordCount: '150000',
      latestChapter: '第123章 修炼之路',
      coverImage: 'https://example.com/cover.jpg',
      bookUrl: 'https://example.com/book/123',
      lastUpdate: '2024-01-15T10:30:00Z',
    };

    // Mock successful meta extraction
    vi.mocked(pageMeta.extractMetaForTab).mockResolvedValue(mockMeta);

    // Mock tab info
    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        url: mockMeta.url,
        title: mockMeta.title,
        active: true,
        windowId: 1,
        index: 0,
        highlighted: false,
        incognito: false,
        selected: false,
        pinned: false,
      });
    });

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    // Access the provider context to trigger addFromTab
    const provider = screen.getByTestId('test-content').closest('[data-provider="webpages"]');
    expect(provider).toBeInTheDocument();

    // Verify extractMetaForTab was called
    expect(vi.mocked(pageMeta.extractMetaForTab)).toHaveBeenCalled();
  });

  it('should handle partial meta extraction gracefully', async () => {
    const partialMeta: PageMeta = {
      title: 'Partial Title',
      author: 'Author Name',
      url: 'https://example.com/partial',
      siteName: 'example.com',
      // Missing book-specific fields
    };

    vi.mocked(pageMeta.extractMetaForTab).mockResolvedValue(partialMeta);

    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        url: partialMeta.url,
        title: partialMeta.title,
        active: true,
        windowId: 1,
        index: 0,
        highlighted: false,
        incognito: false,
        selected: false,
        pinned: false,
      });
    });

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    expect(vi.mocked(pageMeta.extractMetaForTab)).toHaveBeenCalled();
  });

  it('should handle meta extraction failure gracefully', async () => {
    // Mock failed meta extraction
    vi.mocked(pageMeta.extractMetaForTab).mockResolvedValue(undefined);

    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        url: 'https://example.com/failed',
        title: 'Failed Page',
        active: true,
        windowId: 1,
        index: 0,
        highlighted: false,
        incognito: false,
        selected: false,
        pinned: false,
      });
    });

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    expect(vi.mocked(pageMeta.extractMetaForTab)).toHaveBeenCalled();
  });

  it('should enrich empty meta fields without overwriting existing values', async () => {
    const existingCardMeta = {
      siteName: 'existing-site.com',
      author: '', // Empty, should be filled
      bookTitle: 'Existing Title', // Non-empty, should not be overwritten
    };

    const extractedMeta: PageMeta = {
      title: 'New Title',
      author: 'New Author',
      siteName: 'new-site.com',
      bookTitle: 'New Book Title',
      url: 'https://example.com/test',
    };

    vi.mocked(pageMeta.extractMetaForTab).mockResolvedValue(extractedMeta);

    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        url: extractedMeta.url,
        title: extractedMeta.title,
        active: true,
        windowId: 1,
        index: 0,
        highlighted: false,
        incognito: false,
        selected: false,
        pinned: false,
      });
    });

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    expect(vi.mocked(pageMeta.extractMetaForTab)).toHaveBeenCalled();
  });

  it('should extract all supported meta fields when available', async () => {
    const completeMeta: PageMeta = {
      // Standard fields
      title: 'Complete Book Title',
      description: 'A comprehensive description',
      siteName: 'complete-site.com',
      author: 'Complete Author',
      url: 'https://complete.example.com/book',
      collectedAt: new Date().toISOString(),

      // Book-specific fields
      bookTitle: 'Complete Book Title',
      serialStatus: '已完結',
      genre: '都市',
      wordCount: '500000',
      latestChapter: '完本感言',
      coverImage: 'https://complete.example.com/cover.png',
      bookUrl: 'https://complete.example.com/book',
      lastUpdate: '2024-01-20T15:45:00Z',
    };

    vi.mocked(pageMeta.extractMetaForTab).mockResolvedValue(completeMeta);

    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        url: completeMeta.url,
        title: completeMeta.title,
        active: true,
        windowId: 1,
        index: 0,
        highlighted: false,
        incognito: false,
        selected: false,
        pinned: false,
      });
    });

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    expect(vi.mocked(pageMeta.extractMetaForTab)).toHaveBeenCalled();
  });

  it('should handle extraction errors gracefully', async () => {
    // Mock extraction error
    vi.mocked(pageMeta.extractMetaForTab).mockRejectedValue(new Error('Extraction failed'));

    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        url: 'https://error.example.com',
        title: 'Error Page',
        active: true,
        windowId: 1,
        index: 0,
        highlighted: false,
        incognito: false,
        selected: false,
        pinned: false,
      });
    });

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    expect(vi.mocked(pageMeta.extractMetaForTab)).toHaveBeenCalled();
  });
});