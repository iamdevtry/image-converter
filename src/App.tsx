import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ConversionOptions, processBatch } from './utils/imageProcessing';
import { saveAs } from 'file-saver';

// Define types for our application
interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: File;
  error?: string;
}

interface AppState {
  step: 'home' | 'format' | 'size' | 'confirm' | 'progress' | 'download';
  files: ImageFile[];
  options: ConversionOptions;
  progress: number;
}

const App: React.FC = () => {
  // Initialize state
  const [state, setState] = useState<AppState>({
    step: 'home',
    files: [],
    options: {
      format: 'jpg',
      quality: 80,
      maintainAspectRatio: true,
    },
    progress: 0,
  });

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }));

    setState(prevState => ({
      ...prevState,
      files: [...prevState.files, ...newFiles],
      step: prevState.step === 'home' ? 'format' : prevState.step,
    }));
  }, []);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.ico', '.heif'],
    },
    multiple: true,
  });

  // Handle format selection
  const handleFormatChange = (format: string) => {
    setState(prevState => ({
      ...prevState,
      options: { ...prevState.options, format },
    }));
  };

  // Handle size customization
  const handleSizeChange = (width?: number, height?: number) => {
    setState(prevState => ({
      ...prevState,
      options: { ...prevState.options, width, height },
    }));
  };

  // Handle quality change
  const handleQualityChange = (quality: number) => {
    setState(prevState => ({
      ...prevState,
      options: { ...prevState.options, quality },
    }));
  };

  // Navigate to next step
  const nextStep = () => {
    setState(prevState => {
      const steps = ['home', 'format', 'size', 'confirm', 'progress', 'download'] as const;
      const currentIndex = steps.indexOf(prevState.step);
      const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
      return { ...prevState, step: steps[nextIndex] };
    });
  };

  // Navigate to previous step
  const prevStep = () => {
    setState(prevState => {
      const steps = ['home', 'format', 'size', 'confirm', 'progress', 'download'] as const;
      const currentIndex = steps.indexOf(prevState.step);
      const prevIndex = Math.max(currentIndex - 1, 0);
      return { ...prevState, step: steps[prevIndex] };
    });
  };

  // Start conversion process
  const startConversion = async () => {
    setState(prevState => ({
      ...prevState,
      step: 'progress',
      progress: 0,
    }));

    try {
      // Process files in batches
      const totalFiles = state.files.length;
      let processedCount = 0;

      // Update file status to processing
      setState(prevState => ({
        ...prevState,
        files: prevState.files.map(file => ({
          ...file,
          status: 'processing',
        })),
      }));

      // Process files in smaller batches to avoid UI freezing
      const batchSize = 3;
      for (let i = 0; i < state.files.length; i += batchSize) {
        const batch = state.files.slice(i, i + batchSize);
        const filesToProcess = batch.map(item => item.file);
        
        try {
          const results = await processBatch(filesToProcess, state.options);
          
          // Update processed files
          setState(prevState => {
            const updatedFiles = [...prevState.files];
            for (let j = 0; j < results.length; j++) {
              const index = i + j;
              if (index < updatedFiles.length) {
                updatedFiles[index] = {
                  ...updatedFiles[index],
                  status: 'completed',
                  result: results[j],
                };
              }
            }
            
            processedCount += results.length;
            const progress = Math.round((processedCount / totalFiles) * 100);
            
            return {
              ...prevState,
              files: updatedFiles,
              progress,
            };
          });
        } catch (error) {
          // Handle batch processing error
          console.error('Error processing batch:', error);
          
          // Mark files in this batch as error
          setState(prevState => {
            const updatedFiles = [...prevState.files];
            for (let j = 0; j < batch.length; j++) {
              const index = i + j;
              if (index < updatedFiles.length) {
                updatedFiles[index] = {
                  ...updatedFiles[index],
                  status: 'error',
                  error: 'Failed to process image',
                };
              }
            }
            
            processedCount += batch.length;
            const progress = Math.round((processedCount / totalFiles) * 100);
            
            return {
              ...prevState,
              files: updatedFiles,
              progress,
            };
          });
        }
      }

      // Move to download step when complete
      setState(prevState => ({
        ...prevState,
        step: 'download',
        progress: 100,
      }));
    } catch (error) {
      console.error('Conversion error:', error);
      // Handle overall conversion error
    }
  };

  // Download a single file
  const downloadFile = (file: ImageFile) => {
    if (file.result) {
      saveAs(file.result, file.result.name);
    }
  };

  // Download all files as zip
  const downloadAllFiles = () => {
    state.files.forEach(file => {
      if (file.result) {
        saveAs(file.result, file.result.name);
      }
    });
  };

  // Reset and start over
  const startOver = () => {
    // Clean up object URLs to prevent memory leaks
    state.files.forEach(file => {
      URL.revokeObjectURL(file.preview);
    });
    
    setState({
      step: 'home',
      files: [],
      options: {
        format: 'jpg',
        quality: 80,
        maintainAspectRatio: true,
      },
      progress: 0,
    });
  };

  // Render different screens based on current step
  const renderStep = () => {
    switch (state.step) {
      case 'home':
        return (
          <div className="flex flex-col items-center">
            <div 
              className='flex flex-col items-center' 
              style={{ backgroundImage: "url('/banner.png')", backgroundSize: 'cover', backgroundPosition: 'center', padding: '14%' }}
            >
              <div className="self-stretch text-center justify-start text-white text-5xl font-extrabold leading-[60px]">Effortlessly convert your images to different formats and sizes</div>
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-lg p-12 w-full max-w-2xl text-center cursor-pointer ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-lg text-white">Drag and drop your images here or click to browse</p>
                <button className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-md hover:cursor-pointer">
                  Select File
                </button>
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Common conversions:</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <button className="p-4 border rounded-lg text-center">JPG to PNG</button>
                <button className="p-4 border rounded-lg text-center">PNG to JPG</button>
                <button className="p-4 border rounded-lg text-center">WebP to JPG</button>
                <button className="p-4 border rounded-lg text-center">Resize Image</button>
                <button className="p-4 border rounded-lg text-center">Compress Image</button>
                <button className="p-4 border rounded-lg text-center">Rotate Image</button>
                <button className="p-4 border rounded-lg text-center">Add Image to PDF</button>
                <button className="p-4 border rounded-lg text-center">Remove Background</button>
              </div>
            </div>
          </div>
        );
        
      case 'format':
        return (
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-6">Choose an output format</h1>
            
            <div className="w-full max-w-2xl">
              <h2 className="text-xl mb-4">Common formats:</h2>
              <div className="flex flex-wrap gap-4 mb-8">
                {['JPEG', 'PNG', 'GIF'].map(format => (
                  <button
                    key={format}
                    className={`px-6 py-3 rounded-lg border ${
                      state.options.format.toUpperCase() === format ? 'bg-blue-500 text-white' : 'bg-white'
                    }`}
                    onClick={() => handleFormatChange(format.toLowerCase())}
                  >
                    {format}
                  </button>
                ))}
              </div>
              
              <h2 className="text-xl mb-4">Other formats:</h2>
              <div className="flex flex-col gap-2">
                {['TIFF', 'WEBP', 'BMP', 'ICO', 'HEIF', 'PDF'].map(format => (
                  <div 
                    key={format}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <span>{format}</span>
                    <input
                      type="radio"
                      checked={state.options.format.toUpperCase() === format}
                      onChange={() => handleFormatChange(format.toLowerCase())}
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between mt-8">
                <button 
                  className="px-6 py-2 bg-gray-200 rounded-md"
                  onClick={prevStep}
                >
                  Back
                </button>
                <button 
                  className="px-6 py-2 bg-blue-500 text-white rounded-md"
                  onClick={nextStep}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'size':
        return (
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-6">Output Size</h1>
            
            <div className="w-full max-w-2xl">
              <p className="mb-4">Original Image: 1920 x 1080 (2.07MP)</p>
              
              <div className="mb-6">
                <p className="font-semibold mb-2">New Image:</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block mb-1">Width:</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded"
                      value={state.options.width || ''}
                      onChange={(e) => handleSizeChange(parseInt(e.target.value) || undefined, state.options.height)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1">Height:</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded"
                      value={state.options.height || ''}
                      onChange={(e) => handleSizeChange(state.options.width, parseInt(e.target.value) || undefined)}
                    />
                  </div>
                  <button className="p-2 border rounded">🔒</button>
                </div>
              </div>
              
              {/* <div className="mb-6">
                <p className="font-semibold mb-2">Preset sizes:</p>
                <div className="flex gap-2">
                  <button className="px-4 py-2 border rounded hover:cursor-pointer">Small</button>
                  <button className="px-4 py-2 border rounded hover:cursor-pointer">Medium</button>
                  <button className="px-4 py-2 border rounded hover:cursor-pointer">Large</button>
                  <button className="px-4 py-2 border rounded hover:cursor-pointer">Custom</button>
                </div>
              </div> */}
              
              <div className="mb-6">
                <p className="font-semibold mb-2">Scale by percentage: {state.options.quality}%</p>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  className="w-full"
                  value={state.options.quality}
                  onChange={(e) => handleQualityChange(parseInt(e.target.value))}
                />
              </div>
              
              <div className="mb-6">
                <p className="font-semibold mb-2">Resolution:</p>
                <select className="w-full p-2 border rounded">
                  <option>72 DPI</option>
                  <option>96 DPI</option>
                  <option>150 DPI</option>
                  <option>300 DPI</option>
                </select>
              </div>
              
              <div className="flex justify-between mt-8">
                <button 
                  className="px-6 py-2 bg-gray-200 rounded-md"
                  onClick={prevStep}
                >
                  Back
                </button>
                <button 
                  className="px-6 py-2 bg-blue-500 text-white rounded-md"
                  onClick={nextStep}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'confirm':
        return (
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-6">Conversion Settings</h1>
            
            <div className="w-full max-w-2xl">
              <div className="mb-6">
                <p className="font-semibold mb-2">Files to convert:</p>
                <div className="border rounded-lg p-4">
                  {state.files.map(file => (
                    <div key={file.id} className="flex items-center gap-4 mb-2">
                      <img src={file.preview} alt="" className="w-12 h-12 object-cover rounded" />
                      <span>{file.file.name} ({(file.file.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="font-semibold">Output format: {state.options.format.toUpperCase()}</p>
              </div>
              
              <div className="mb-4">
                <p className="font-semibold mb-1">Quality: {state.options.quality}%</p>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  className="w-full"
                  value={state.options.quality}
                  // onChange={(e) => handleQualityChange(parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2 mb-6">
                <p>Color: RGB</p>
                <p>Resolution: 72 DPI</p>
                <p>Progressive: On</p>
                <p>Optimize: On</p>
                <p>Comment: Converted by Image Converter</p>
                <p>Profile: sRGB IEC61966-2.1</p>
              </div>
              
              <div className="mb-6">
                <p>Output Size: {state.options.width || 'Original'} x {state.options.height || 'Original'}</p>
              </div>
              
              <div className="flex justify-between mt-8">
                <button 
                  className="px-6 py-2 bg-gray-200 rounded-md"
                  onClick={prevStep}
                >
                  Back
                </button>
                <button 
                  className="px-6 py-2 bg-blue-500 text-white rounded-md"
                  onClick={startConversion}
                >
                  Start Conversion
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'progress':
        return (
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-6">Converting images to {state.options.format.toUpperCase()}</h1>
            
            <div className="w-full max-w-2xl">
              <div className="mb-6">
                <p className="font-semibold mb-2">Overall progress:</p>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-blue-500 h-4 rounded-full" 
                    style={{ width: `${state.progress}%` }}
                  ></div>
                </div>
                <p className="mt-1">{state.files.filter(f => f.status === 'completed').length}/{state.files.length}</p>
              </div>
              
              <div className="space-y-6">
                {state.files.map(file => (
                  <div key={file.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-4 mb-2">
                      <img src={file.preview} alt="" className="w-12 h-12 object-cover rounded" />
                      <div>
                        <p>{file.file.name}</p>
                        <p className="text-sm text-gray-500">
                          {file.file.type.split('/')[1].toUpperCase()} ({(file.file.size / (1024 * 1024)).toFixed(1)} MB) → 
                          {state.options.format.toUpperCase()} 
                          {file.result ? ` (${(file.result.size / (1024 * 1024)).toFixed(1)} MB)` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          file.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                        }`} 
                        style={{ 
                          width: file.status === 'pending' ? '0%' : 
                                 file.status === 'processing' ? '50%' : '100%' 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center mt-8">
                <button 
                  className="px-6 py-2 bg-gray-200 rounded-md"
                  onClick={() => {
                    // In a real app, we would implement cancellation logic
                    startOver();
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'download':
        return (
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-6">Your files have been converted</h1>
            
            <p className="mb-6">
              You can download them here or share the link with others. 
              If you have any issues, please contact us.
            </p>
            
            <div className="w-full max-w-2xl">
              <div className="space-y-4 mb-6">
                {state.files.map(file => (
                  file.result && (
                    <div key={file.id} className="flex items-center justify-between border rounded-lg p-4">
                      <div className="flex items-center gap-4">
                        <img src={file.preview} alt="" className="w-12 h-12 object-cover rounded" />
                        <div>
                          <p>{file.result.name}</p>
                          <p className="text-sm text-gray-500">
                            {state.options.format.toUpperCase()} - {state.options.width || 'Original'}x{state.options.height || 'Original'}
                          </p>
                        </div>
                      </div>
                      <button 
                        className="p-2 hover:cursor-pointer bg-blue-500 text-white rounded-2xl w-8 h-8 flex items-center justify-center"
                        onClick={() => downloadFile(file)}
                      >
                        ↓
                      </button>
                    </div>
                  )
                ))}
              </div>
              
              <div className="border rounded-lg p-4 mb-6">
                <p>Copy link</p>
                <p className="text-sm text-gray-500 mt-1">https://www.imageconverter.com/convert/1-jpg/</p>
              </div>
              
              <div className="flex justify-between">
                <button 
                  className="px-6 py-2 bg-blue-500 text-white rounded-md hover:cursor-pointer"
                  onClick={downloadAllFiles}
                >
                  Download All
                </button>
                <button 
                  className="px-6 py-2 bg-gray-200 rounded-md hover:cursor-pointer"
                  onClick={startOver}
                >
                  Convert More Images
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <main className="max-w-6xl mx-auto py-8">
        {renderStep()}
      </main>
    </div>
  );
};

export default App;
