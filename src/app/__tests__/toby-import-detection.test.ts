import { describe, it, expect } from 'vitest';

describe('Toby Import Detection Logic', () => {
  // Simulate the detection logic from App.tsx
  function detectTobyStructure(obj: any): { hasOrgs: boolean; lists: number; links: number } {
    let lists = 0;
    let links = 0;
    let hasOrgs = false;

    if (Array.isArray(obj?.lists)) {
      lists = obj.lists.length;
      for (const l of obj.lists) {
        if (Array.isArray(l?.cards)) links += l.cards.length;
      }
    }

    if (Array.isArray(obj?.groups)) {
      hasOrgs = true; // v4 groups should use Organization structure
      for (const g of obj.groups) {
        if (Array.isArray(g?.lists)) {
          lists += g.lists.length;
          for (const l of g.lists) {
            if (Array.isArray(l?.cards)) links += l.cards.length;
          }
        }
      }
    }

    if (Array.isArray(obj?.organizations)) {
      hasOrgs = true;
      for (const o of obj.organizations) {
        if (Array.isArray(o?.groups)) {
          for (const g of o.groups) {
            if (Array.isArray(g?.lists)) {
              lists += g.lists.length;
              for (const l of g.lists) {
                if (Array.isArray(l?.cards)) links += l.cards.length;
              }
            }
          }
        }
      }
    }

    return { hasOrgs, lists, links };
  }

  it('should detect v3 format with lists only (no orgs)', () => {
    const tobyV3 = {
      version: 3,
      lists: [
        {
          title: 'Test List',
          cards: [
            { title: 'Card 1', url: 'https://example.com/1' },
            { title: 'Card 2', url: 'https://example.com/2' }
          ]
        }
      ]
    };

    const result = detectTobyStructure(tobyV3);

    expect(result.hasOrgs).toBe(false); // Should use importTobyAsNewCategory
    expect(result.lists).toBe(1);
    expect(result.links).toBe(2);
  });

  it('should detect v4 format with groups (should use orgs path)', () => {
    const tobyV4Groups = {
      version: 4,
      groups: [
        {
          name: 'My Collections',
          lists: [
            {
              title: 'List 1',
              cards: [
                { title: 'Card 1', url: 'https://example.com/1' }
              ]
            },
            {
              title: 'List 2',
              cards: [
                { title: 'Card 2', url: 'https://example.com/2' },
                { title: 'Card 3', url: 'https://example.com/3' }
              ]
            }
          ]
        }
      ]
    };

    const result = detectTobyStructure(tobyV4Groups);

    expect(result.hasOrgs).toBe(true); // Should use importTobyV4WithOrganizations
    expect(result.lists).toBe(2);
    expect(result.links).toBe(3);
  });

  it('should detect v4 format with organizations', () => {
    const tobyV4Orgs = {
      version: 4,
      organizations: [
        {
          name: 'Work',
          groups: [
            {
              name: 'Projects',
              lists: [
                {
                  title: 'Active',
                  cards: [
                    { title: 'Project 1', url: 'https://work.com/project1' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    const result = detectTobyStructure(tobyV4Orgs);

    expect(result.hasOrgs).toBe(true); // Should use importTobyV4WithOrganizations
    expect(result.lists).toBe(1);
    expect(result.links).toBe(1);
  });
});