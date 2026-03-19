import React from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import './ActionButtons.css';

const ActionButtons = ({ onEdit, onDelete, size = 18, className = '' }) => {
    return (
        <div className={`ab-container ${className}`}>
            {onEdit && (
                <button
                    className="ab-btn ab-btn--edit"
                    onClick={onEdit}
                    title="Edit"
                    type="button"
                >
                    <FiEdit2 size={size} strokeWidth={2.5} />
                </button>
            )}
            {onDelete && (
                <button
                    className="ab-btn ab-btn--delete"
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
