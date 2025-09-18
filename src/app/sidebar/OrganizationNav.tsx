import React from 'react';
import { useOrganizations } from './organizations';

export const OrganizationNav: React.FC = () => {
  const { organizations, selectedOrgId, setCurrentOrganization } = useOrganizations();

  return (
    <div className="w-16 flex flex-col items-center py-4 h-full">
      {/* Organization icons */}
      <div className="space-y-3 flex-1">
        {organizations.map((org, index) => (
          <button
            key={org.id}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all hover:scale-105 ${
              selectedOrgId === org.id
                ? 'ring-2 ring-blue-400 shadow-lg'
                : 'hover:ring-2 hover:ring-slate-400'
            }`}
            style={{ backgroundColor: org.color || '#64748b' }}
            onClick={() => setCurrentOrganization(org.id)}
            title={org.name}
          >
            {org.name.slice(0, 2).toUpperCase()}
          </button>
        ))}

        {/* Add new organization button */}
        <button
          className="w-12 h-12 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center text-slate-400 hover:border-slate-300 hover:text-slate-300 transition-colors"
          onClick={() => { try { window.dispatchEvent(new CustomEvent('organizations:add-new')); } catch {} }}
          title="Add new organization"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {/* Bottom section - Settings and Theme */}
      <div className="space-y-3 mt-4">
        {/* App Settings */}
        <button
          className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-300 hover:bg-slate-700 transition-colors"
          title="App Settings"
          onClick={() => { try { window.dispatchEvent(new CustomEvent('app:open-settings')); } catch {} }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="2.2" />
            <path d="M12 3.8v1.4M12 18.8v1.4M4.75 6.35l.99.99M18.26 19.86l.99.99M3.8 12h1.4M18.8 12h1.4M4.75 17.65l.99-.99M18.26 4.14l.99-.99" />
          </svg>
        </button>

        {/* Toggle Theme */}
        <button
          className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-300 hover:bg-slate-700 transition-colors"
          title="Toggle Theme"
          onClick={() => { try { window.dispatchEvent(new CustomEvent('app:toggle-theme')); } catch {} }}
        >
          <svg className="w-5 h-5 text-violet-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1111.21 3c.03 0 .06 0 .09 0a7 7 0 109.7 9.7c0 .03 0 .06 0 .09z" />
          </svg>
        </button>
      </div>
    </div>
  );
};