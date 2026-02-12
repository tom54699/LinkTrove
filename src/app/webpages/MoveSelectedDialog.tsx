import React from 'react';
import { useCategories } from '../sidebar/categories';
import { createStorageService } from '../../background/storageService';
import { useI18n } from '../i18n';
import { CustomSelect } from '../ui/CustomSelect';
import { useEditableDialogCloseGuard } from '../ui/useEditableDialogCloseGuard';

export interface MoveSelectedDialogProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onMove: (categoryId: string, subcategoryId: string) => Promise<void>;
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
  const [moving, setMoving] = React.useState(false);
  const dialogGuard = useEditableDialogCloseGuard(onClose);

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

  const handleMove = async () => {
    if (!selectedCategoryId || !selectedSubcategoryId) return;
    setMoving(true);
    try {
      await onMove(selectedCategoryId, selectedSubcategoryId);
    } finally {
      setMoving(false);
    }
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      {...dialogGuard.overlayProps}
    >
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-[480px] max-w-[90vw] p-6 shadow-2xl"
        {...dialogGuard.dialogProps}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-labelledby="move-dialog-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="move-dialog-title" className="text-lg font-bold">
            {t('move_dialog_title', [String(selectedCount)])}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
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
        <div className="space-y-5">
          {/* Collection Selector (Category) */}
          <div>
            <label
              htmlFor="collection-selector"
              className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2"
            >
              {t('move_label_collection')}
            </label>
            <CustomSelect
              value={selectedCategoryId}
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              onChange={(val) => setSelectedCategoryId(val)}
              placeholder={t('move_select_collection')}
            />
          </div>

          {/* Group Selector (Subcategory/Group) */}
          <div>
            <label
              htmlFor="group-selector"
              className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2"
            >
              {t('move_label_group')}
            </label>
            <CustomSelect
              value={selectedSubcategoryId}
              options={subcategories
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(sub => ({ value: sub.id, label: sub.name }))
              }
              onChange={(val) => setSelectedSubcategoryId(val)}
              disabled={!selectedCategoryId || loading || subcategories.length === 0}
              placeholder={loading ? t('loading') : t('move_select_group')}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-5 py-2 text-sm font-bold rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-all cursor-pointer"
            onClick={onClose}
          >
            {t('btn_cancel')}
          </button>
          <button
            type="button"
            className="px-5 py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={handleMove}
            disabled={!selectedCategoryId || !selectedSubcategoryId || moving}
          >
            {moving && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {moving ? t('btn_moving') : t('btn_move')}
          </button>
        </div>
      </div>
    </div>
  );
};
