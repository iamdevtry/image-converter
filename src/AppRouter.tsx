import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import App from './App';
import ValidationPage from './pages/ValidationPage';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <div>
        <nav className="bg-gray-100 p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <Link to="/" className="text-xl text-neutral-900 text-lg font-bold leading-snug">Image Converter</Link>
            </div>
            <div className="flex space-x-4">
              <Link to="/" className="px-3 py-2 rounded hover:bg-gray-200">Home</Link>
              <Link to="/validation" className="px-3 py-2 rounded hover:bg-gray-200">Validation</Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/validation" element={<ValidationPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default AppRouter;
