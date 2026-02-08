import React from 'react';
import './SubLoader.css';

const SubLoader = () => {
    return (
        <div className="sub-loader-wrapper">
            <div className="three-body">
                <div className="three-body__dot" />
                <div className="three-body__dot" />
                <div className="three-body__dot" />
            </div>
        </div>
    );
}

export default SubLoader;
