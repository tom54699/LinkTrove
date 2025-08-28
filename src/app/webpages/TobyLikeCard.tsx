import React from 'react';
import '../../styles/toby-like.css';

export interface TobyLikeCardProps {
  title: string;
  description?: string;
  faviconText?: string; // e.g., site initials
  url?: string;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpen?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onMove?: () => void;
}

export const TobyLikeCard: React.FC<TobyLikeCardProps> = ({
  title,
  description,
  faviconText = 'WW',
  selectMode,
  selected,
  onToggleSelect,
  onOpen,
  onDelete,
  onEdit,
  onMove,
}) => {
  return (
    <div className="tobylike">
      <div className="card" data-select={selectMode ? 'true' : undefined} role="button" tabIndex={0} onClick={onOpen}>
        <div className="card-content">
          <div className="icon-container">
            {faviconText}
            <div className="checkbox-overlay" onClick={(e)=>{ e.stopPropagation(); onToggleSelect?.(); }}>
              <div className={`checkbox ${selected ? 'checked' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
              </div>
            </div>
          </div>
          <div className="content">
            <h2 className="title" title={title}>{title}</h2>
            {description && <p className="description" title={description}>{description}</p>}
          </div>
        </div>

        <button className="delete-btn" title="刪除" onClick={(e)=>{ e.stopPropagation(); onDelete?.(); }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <path d="M18 6 L6 18"></path>
            <path d="M6 6 L18 18"></path>
          </svg>
        </button>

        <div className="actions" onClick={(e)=>e.stopPropagation()}>
          <button className="action-btn" title="編輯" onClick={onEdit}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"></path>
              <path d="M13.5 6.5l4 4"></path>
            </svg>
          </button>
          <button className="action-btn" title="移動" onClick={onMove}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 15l6 -6"></path>
              <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"></path>
              <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

