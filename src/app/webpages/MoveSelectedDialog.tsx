import React from 'react';
import { useCategories } from '../sidebar/categories';
import { createStorageService } from '../../background/storageService';
import { useI18n } from '../i18n';

export interface MoveSelectedDialogProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onMove: (categoryId: string, subcategoryId: string) => void;
}

interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  order: number;
}

export const MoveSelectedDialog: React.FC<MoveSelectedDialogProps> = ({
  isOpen,
  selectedCount,
  onClose,
  onMove,
}) => {
  const { t } = useI18n();
  const { categories } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = React.useState<string>('');
  const [subcategories, setSubcategories] = React.useState<Subcategory[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Load subcategories when category changes OR when dialog opens
  React.useEffect(() => {
    if (!selectedCategoryId || !isOpen) {
      setSubcategories([]);
      return;
    }

    const loadSubcategories = async () => {
      setLoading(true);
      try {
        const svc = createStorageService();
        const groups = await (svc as any).listSubcategories?.(selectedCategoryId);
        if (groups && Array.isArray(groups)) {
          setSubcategories(groups);
        } else {
          setSubcategories([]);
        }
      } catch (error) {
        console.error('Failed to load subcategories:', error);
        setSubcategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubcategories();
  }, [selectedCategoryId, isOpen]);

  // Reset subcategory when category changes
  React.useEffect(() => {
    setSelectedSubcategoryId('');
  }, [selectedCategoryId]);

  // Initialize with first category
  React.useEffect(() => {
    if (isOpen && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [isOpen, categories, selectedCategoryId]);

  const handleMove = () => {
    if (!selectedCategoryId || !selectedSubcategoryId) return;
    onMove(selectedCategoryId, selectedSubcategoryId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && selectedCategoryId && selectedSubcategoryId) {
      handleMove();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-lg border border-slate-700 bg-[var(--panel)] w-[480px] max-w-[90vw] p-5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-labelledby="move-dialog-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="move-dialog-title" className="text-lg font-medium">
            {t('move_dialog_title', [String(selectedCount)])}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6l-12 12"></path>
              <path d="M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Collection Selector (Category) */}
          <div>
            <label
              htmlFor="collection-selector"
              className="block text-sm font-medium mb-2 opacity-90"
            >
              {t('move_label_collection')}
            </label>
            <div className="relative">
              <select
                id="collection-selector"
                className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-2 pr-10 text-sm appearance-none focus:outline-none focus:border-slate-500"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                <option value="">{t('move_select_collection')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-60"
                >
                  <path d="M6 9l6 6l6 -6"></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Group Selector (Subcategory/Group) */}
          <div>
            <label
              htmlFor="group-selector"
              className="block text-sm font-medium mb-2 opacity-90"
            >
              {t('move_label_group')}
            </label>
            <div className="relative">
              <select
                id="group-selector"
                className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-2 pr-10 text-sm appearance-none focus:outline-none focus:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                value={selectedSubcategoryId}
                onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                disabled={!selectedCategoryId || loading || subcategories.length === 0}
              >
                <option value="">
                  {loading ? t('loading') : t('move_select_group')}
                </option>
                {subcategories
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-60"
                >
                  <path d="M6 9l6 6l6 -6"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 text-sm rounded border border-slate-600 hover:bg-slate-800 transition-colors"
            onClick={onClose}
          >
            {t('btn_cancel')}
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleMove}
            disabled={!selectedCategoryId || !selectedSubcategoryId}
          >
            {t('btn_move')}
          </button>
        </div>
      </div>
    </div>
  );
};
