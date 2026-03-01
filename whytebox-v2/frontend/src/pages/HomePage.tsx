import { Link } from 'react-router-dom';
import { ViewInAr, MenuBook, FlashOn, Group } from '@mui/icons-material';

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-5xl font-bold mb-6 gradient-text">
          Visualize Neural Networks in 3D
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          WhyteBox is an interactive platform for understanding deep learning models
          through immersive 3D visualization and explainability tools.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/models" className="btn btn-primary">
            Explore Models
          </Link>
          <Link to="/tutorials" className="btn btn-secondary">
            Start Learning
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card card-hover text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <ViewInAr className="text-primary-600" sx={{ fontSize: 24 }} />
          </div>
          <h3 className="text-lg font-semibold mb-2">3D Visualization</h3>
          <p className="text-gray-600 text-sm">
            Explore neural network architectures in interactive 3D space
          </p>
        </div>

        <div className="card card-hover text-center">
          <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <FlashOn className="text-secondary-600" sx={{ fontSize: 24 }} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Explainability</h3>
          <p className="text-gray-600 text-sm">
            Understand model decisions with Grad-CAM and saliency maps
          </p>
        </div>

        <div className="card card-hover text-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <MenuBook className="text-green-600" sx={{ fontSize: 24 }} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Tutorials</h3>
          <p className="text-gray-600 text-sm">
            Learn deep learning concepts through interactive lessons
          </p>
        </div>

        <div className="card card-hover text-center">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Group className="text-orange-600" sx={{ fontSize: 24 }} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Educational</h3>
          <p className="text-gray-600 text-sm">
            Perfect for students, educators, and researchers
          </p>
        </div>
      </section>

      {/* Quick Start */}
      <section className="card">
        <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-1">Choose a Model</h3>
              <p className="text-gray-600 text-sm">
                Browse our collection of pre-trained models or upload your own
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-1">Visualize in 3D</h3>
              <p className="text-gray-600 text-sm">
                Explore the model architecture in interactive 3D space
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-1">Understand Predictions</h3>
              <p className="text-gray-600 text-sm">
                Use explainability tools to see how the model makes decisions
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Made with Bob
