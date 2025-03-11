import React from 'react';
import ErrorHandler from '../utils/ErrorHandler';

/**
 * Component for displaying documentation about explainability techniques
 */
const ExplainabilityDocs = ({ technique, isOpen, onClose }) => {
  if (!isOpen) return null;
  
  const docs = ErrorHandler.getExplainabilityDocs(technique);
  
  return (
    <div className="docs-overlay">
      <div className="docs-content">
        <button className="docs-close-btn" onClick={onClose}>×</button>
        <h2>{docs.title}</h2>
        
        <div className="docs-section">
          <h3>What is it?</h3>
          <p>{docs.description}</p>
        </div>
        
        <div className="docs-section">
          <h3>When to use it</h3>
          <ul>
            {docs.useCases.map((use, index) => (
              <li key={index}>{use}</li>
            ))}
          </ul>
        </div>
        
        <div className="docs-section">
          <h3>Limitations</h3>
          <ul>
            {docs.limitations.map((limitation, index) => (
              <li key={index}>{limitation}</li>
            ))}
          </ul>
        </div>
        
        <div className="docs-section docs-reference">
          <h3>Learn more</h3>
          <p className="reference-text">
            {docs.reference}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExplainabilityDocs;
