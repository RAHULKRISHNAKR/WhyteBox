import React, { useState } from 'react';

const MobileNetV2Explainer = ({ onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      title: "MobileNetV2 Architecture Overview",
      content: (
        <>
          <p>MobileNetV2 is designed specifically for mobile and edge devices, offering a balance between accuracy, model size, and inference speed.</p>
          <div className="explainer-image">
            <img src="/images/mobilenetv2-architecture.png" alt="MobileNetV2 Architecture" 
                 onError={(e) => e.target.src = "https://miro.medium.com/max/1400/1*60gs-SFYxDrQQ_T8ePqprQ.jpeg"} />
          </div>
          <p>The architecture builds upon MobileNetV1 but introduces two key innovations:</p>
          <ul>
            <li>Linear Bottlenecks</li>
            <li>Inverted Residual Blocks</li>
          </ul>
        </>
      )
    },
    {
      title: "Inverted Residual Blocks",
      content: (
        <>
          <p>Unlike traditional residual connections that go from wide → narrow → wide, MobileNetV2 uses an inverted structure:</p>
          <div className="explainer-diagram">
            <div className="step">
              <div className="arrow-box narrow">Narrow<br/>(16 channels)</div>
              <div className="arrow">↓</div>
              <div className="annotation">Expansion 6×</div>
            </div>
            <div className="step">
              <div className="arrow-box wide">Wide<br/>(96 channels)</div>
              <div className="arrow">↓</div>
              <div className="annotation">Depthwise Conv</div>
            </div>
            <div className="step">
              <div className="arrow-box wide">Wide<br/>(96 channels)</div>
              <div className="arrow">↓</div>
              <div className="annotation">Projection</div>
            </div>
            <div className="step">
              <div className="arrow-box narrow">Narrow<br/>(16 channels)</div>
            </div>
            <div className="skip-connection">Skip Connection</div>
          </div>
          <p>This structure allows the network to use lightweight depthwise convolutions on the expanded feature space, extracting rich features while keeping computation low.</p>
        </>
      )
    },
    {
      title: "Depthwise Separable Convolutions",
      content: (
        <>
          <p>A standard convolution with 32 input channels, 64 output channels, and 3×3 kernels requires:</p>
          <div className="math-expression">3 × 3 × 32 × 64 = 18,432 parameters</div>
          
          <p>MobileNetV2 splits this into two steps:</p>
          <ol>
            <li>
              <strong>Depthwise Convolution:</strong> Apply a single 3×3 filter per input channel<br/>
              <div className="math-expression">3 × 3 × 32 = 288 parameters</div>
            </li>
            <li>
              <strong>Pointwise Convolution:</strong> Apply 1×1 convolutions to change the number of channels<br/>
              <div className="math-expression">1 × 1 × 32 × 64 = 2,048 parameters</div>
            </li>
          </ol>
          
          <p>Total: 288 + 2,048 = 2,336 parameters (87% reduction!)</p>
        </>
      )
    },
    {
      title: "Linear Bottlenecks",
      content: (
        <>
          <p>MobileNetV2 uses linear bottlenecks, which means:</p>
          <ol>
            <li>No activation function is used after the final pointwise convolution in each block</li>
            <li>This preserves feature information in the low-dimensional space</li>
          </ol>
          
          <div className="explainer-comparison">
            <div className="comparison-item">
              <h4>With ReLU in bottleneck</h4>
              <div className="visualization relu-loss">
                <div className="feature-space"></div>
                <div className="feature-space-lost"></div>
              </div>
              <p>ReLU destroys information by setting negative values to zero</p>
            </div>
            <div className="comparison-item">
              <h4>Linear bottleneck (no ReLU)</h4>
              <div className="visualization linear-preserve">
                <div className="feature-space"></div>
              </div>
              <p>Information is preserved in the low-dimensional space</p>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Efficiency Benefits",
      content: (
        <>
          <p>The combination of these techniques provides dramatic efficiency gains:</p>
          
          <div className="benefits-grid">
            <div className="benefit">
              <div className="benefit-icon">📉</div>
              <div className="benefit-label">Parameters</div>
              <div className="benefit-value">3.4 million</div>
              <div className="benefit-compare">(vs. 138M in VGG16)</div>
            </div>
            <div className="benefit">
              <div className="benefit-icon">💾</div>
              <div className="benefit-label">Model Size</div>
              <div className="benefit-value">14 MB</div>
              <div className="benefit-compare">(vs. 528MB in VGG16)</div>
            </div>
            <div className="benefit">
              <div className="benefit-icon">⚡</div>
              <div className="benefit-label">Latency</div>
              <div className="benefit-value">22ms</div>
              <div className="benefit-compare">(Pixel phone)</div>
            </div>
            <div className="benefit">
              <div className="benefit-icon">🔋</div>
              <div className="benefit-label">Efficiency</div>
              <div className="benefit-value">✓✓✓</div>
              <div className="benefit-compare">(Optimized for mobile)</div>
            </div>
          </div>
          
          <p>These improvements make it possible to run deep neural networks on mobile devices with limited computing power and energy constraints.</p>
        </>
      )
    }
  ];
  
  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };
  
  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };
  
  return (
    <div className="mobilenet-explainer">
      <div className="explainer-header">
        <h2>How MobileNetV2 Works</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="explainer-content">
        <h3>{slides[currentSlide].title}</h3>
        <div className="explainer-slide">
          {slides[currentSlide].content}
        </div>
      </div>
      
      <div className="explainer-navigation">
        <button 
          className="nav-button prev" 
          onClick={prevSlide} 
          disabled={currentSlide === 0}
        >
          ← Previous
        </button>
        <div className="explainer-progress">
          {slides.map((_, index) => (
            <span 
              key={index} 
              className={`progress-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
        <button 
          className="nav-button next" 
          onClick={nextSlide} 
          disabled={currentSlide === slides.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default MobileNetV2Explainer;
