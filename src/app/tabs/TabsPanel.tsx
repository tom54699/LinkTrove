import React from 'react';
import { useOpenTabs } from './OpenTabsProvider';
import { TabItem } from './TabItem';

export const TabsPanel: React.FC = () => {
  const { tabs } = useOpenTabs();
  return (
    <div>
      <div className="text-sm mb-2 opacity-80">OPEN TABS</div>
      <div className="space-y-1">
        {tabs.map((t) => (
          <TabItem key={t.id} tab={t} />
        ))}
        {tabs.length === 0 && <div className="opacity-60">No open tabs</div>}
      </div>
    </div>
  );
};
