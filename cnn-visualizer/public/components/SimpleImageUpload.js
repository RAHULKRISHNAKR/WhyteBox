import React, { useState } from 'react';

const SimpleImageUpload = ({ onImageSelected }) => {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const sampleImages = [
    { url: '/assets/images/samples/cat.jpg', label: 'Cat' },
    { url: '/assets/images/samples/dog.jpg', label: 'Dog' },
    { url: '/assets/images/samples/car.jpg', label: 'Car' },
    { url: '/assets/images/samples/house.jpg', label: 'House' }
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files[0]);
    }
  };

  const handleFiles = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
      onImageSelected(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSampleSelect = (imageUrl) => {
    setPreviewUrl(imageUrl);
    onImageSelected(imageUrl);
  };

  return (
    <div className="simple-image-upload">
      <h3>Test the AI with Your Own Image</h3>
      
      <div className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}>
          
        {previewUrl ? (
          <div className="preview-container">
            <img src={previewUrl} alt="Preview" className="image-preview" />
            <button className="reset-btn" onClick={() => setPreviewUrl(null)}>
              Try Another Image
            </button>
          </div>
        ) : (
          <div className="upload-prompt">
            <img src="/assets/images/upload-icon.png" alt="Upload" className="upload-icon" />
            <p>Drag and drop an image here<br />or</p>
            <label className="file-input-label">
              Browse Files
              <input type="file" accept="image/*" onChange={handleFileChange} className="file-input" />
            </label>
          </div>
        )}
      </div>
      
      <div className="sample-images">
        <h4>Or Try These Sample Images:</h4>
        <div className="sample-grid">
          {sampleImages.map((image, index) => (
            <div key={index} className="sample-item" onClick={() => handleSampleSelect(image.url)}>
              <img src={image.url} alt={image.label} />
              <p>{image.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleImageUpload;
