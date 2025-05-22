import React, { useState } from 'react';
import { runAllValidationTests } from '../utils/clientSideValidation';

const ValidationPage: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      const validationResults = await runAllValidationTests();
      setResults(validationResults);
    } catch (err) {
      setError(`Error running tests: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Client-Side Processing Validation</h1>
      
      <div className="mb-6">
        <p className="mb-4">
          This page validates that all image processing in our application happens entirely on the client side,
          ensuring your privacy and security by never uploading your images to any server.
        </p>
        
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300"
        >
          {isRunning ? 'Running Tests...' : 'Run Validation Tests'}
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 rounded-md mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {results && (
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            Test Results: {results.allTestsPassed ? 
              <span className="text-green-600">All Tests Passed ✓</span> : 
              <span className="text-red-600">Some Tests Failed ✗</span>
            }
          </h2>
          
          <div className="space-y-4">
            {results.results.map((result: any, index: number) => (
              <div 
                key={index} 
                className={`p-4 rounded-md ${
                  result.success && !result.networkRequestsMade ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <h3 className="font-bold">
                  {result.test}: {result.success && !result.networkRequestsMade ? '✓' : '✗'}
                </h3>
                <p>{result.message}</p>
                {result.networkRequestsMade && (
                  <p className="text-red-600 mt-2">
                    ⚠️ Network requests were detected during this operation, which indicates that processing may not be entirely client-side.
                  </p>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-bold mb-2">What This Means For You:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your images never leave your device during processing</li>
              <li>Faster conversions as there's no upload/download time</li>
              <li>Works even when you're offline</li>
              <li>Complete privacy - we never see your images</li>
              <li>No server costs passed on to you</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationPage;
