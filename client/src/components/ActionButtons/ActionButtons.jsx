import React from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import './ActionButtons.css';

const ActionButtons = ({ onEdit, onDelete, size = 16, className = '' }) => {
    return (
        <div className={`action-buttons ${className}`}>
            {onEdit && (
                <button
                    className="action-btn action-btn--edit"
                    onClick={onEdit}
                    title="Edit"
                    type="button"
                >
                    <FiEdit2 size={size} strokeWidth={2.5} />
                </button>
            )}
            {onDelete && (
                <button
                    className="action-btn action-btn--delete"
                    onClick={onDelete}
                    title="Delete"
                    type="button"
                >
                    <FiTrash2 size={size} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
};

export default ActionButtons;
