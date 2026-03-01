export default function AboutPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">About WhyteBox</h1>
      <div className="card space-y-4">
        <p className="text-gray-700">
          WhyteBox is an interactive educational platform for visualizing and understanding
          neural network architectures in 3D.
        </p>
        <p className="text-gray-700">
          Built with React, TypeScript, and BabylonJS, WhyteBox provides an immersive
          learning experience for students, educators, and researchers.
        </p>
        <h2 className="text-xl font-semibold mt-6">Features</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Interactive 3D visualization of neural networks</li>
          <li>Explainability tools (Grad-CAM, Saliency Maps, Integrated Gradients)</li>
          <li>Support for PyTorch, TensorFlow, and Keras models</li>
          <li>Educational tutorials and guides</li>
          <li>Real-time inference and analysis</li>
        </ul>
      </div>
    </div>
  );
}

// Made with Bob
