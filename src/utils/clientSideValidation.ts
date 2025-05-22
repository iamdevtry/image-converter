// This file contains tests to validate client-side image processing

import { convertImageFormat, resizeImage, compressImage } from './imageProcessing';

/**
 * This module contains functions to test and validate that all image processing
 * happens entirely on the client side without server uploads.
 */

// Create a test image in memory
const createTestImage = async (width = 100, height = 100, color = 'red'): Promise<File> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  }
  
  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(blob => resolve(blob as Blob), 'image/png');
  });
  
  // Create a File object from the blob
  return new File([blob], 'test-image.png', { type: 'image/png' });
};

// Test format conversion
export const testFormatConversion = async (): Promise<{
  success: boolean;
  message: string;
  networkRequestsMade: boolean;
}> => {
  try {
    const testFile = await createTestImage();
    
    // Monitor network requests
    const networkBefore = performance.getEntriesByType('resource').length;
    
    // Perform conversion
    const convertedFile = await convertImageFormat(testFile, { 
      format: 'jpg',
      quality: 80
    });
    
    const networkAfter = performance.getEntriesByType('resource').length;
    const networkRequestsMade = networkBefore !== networkAfter;
    
    return {
      success: true,
      message: `Successfully converted PNG to JPG (${convertedFile.size} bytes)`,
      networkRequestsMade
    };
  } catch (error) {
    return {
      success: false,
      message: `Error during format conversion: ${error}`,
      networkRequestsMade: false
    };
  }
};

// Test image resizing
export const testImageResizing = async (): Promise<{
  success: boolean;
  message: string;
  networkRequestsMade: boolean;
}> => {
  try {
    const testFile = await createTestImage(200, 200);
    
    // Monitor network requests
    const networkBefore = performance.getEntriesByType('resource').length;
    
    // Perform resizing
    const resizedFile = await resizeImage(testFile, 100, 100);
    
    const networkAfter = performance.getEntriesByType('resource').length;
    const networkRequestsMade = networkBefore !== networkAfter;
    
    return {
      success: true,
      message: `Successfully resized image to 100x100 (${resizedFile.size} bytes)`,
      networkRequestsMade
    };
  } catch (error) {
    return {
      success: false,
      message: `Error during image resizing: ${error}`,
      networkRequestsMade: false
    };
  }
};

// Test image compression
export const testImageCompression = async (): Promise<{
  success: boolean;
  message: string;
  networkRequestsMade: boolean;
}> => {
  try {
    const testFile = await createTestImage(300, 300);
    
    // Monitor network requests
    const networkBefore = performance.getEntriesByType('resource').length;
    
    // Perform compression
    const compressedFile = await compressImage(testFile, 50);
    
    const networkAfter = performance.getEntriesByType('resource').length;
    const networkRequestsMade = networkBefore !== networkAfter;
    
    return {
      success: true,
      message: `Successfully compressed image (${testFile.size} bytes → ${compressedFile.size} bytes)`,
      networkRequestsMade
    };
  } catch (error) {
    return {
      success: false,
      message: `Error during image compression: ${error}`,
      networkRequestsMade: false
    };
  }
};

// Run all validation tests
export const runAllValidationTests = async (): Promise<{
  allTestsPassed: boolean;
  results: Array<{
    test: string;
    success: boolean;
    message: string;
    networkRequestsMade: boolean;
  }>;
}> => {
  const formatResult = await testFormatConversion();
  const resizeResult = await testImageResizing();
  const compressionResult = await testImageCompression();
  
  const results = [
    { test: 'Format Conversion', ...formatResult },
    { test: 'Image Resizing', ...resizeResult },
    { test: 'Image Compression', ...compressionResult }
  ];
  
  const allTestsPassed = results.every(r => r.success && !r.networkRequestsMade);
  
  return {
    allTestsPassed,
    results
  };
};

export default {
  createTestImage,
  testFormatConversion,
  testImageResizing,
  testImageCompression,
  runAllValidationTests
};
