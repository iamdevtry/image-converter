import imageCompression from 'browser-image-compression';
import { readAndCompressImage } from 'browser-image-resizer';

// Interface for image conversion options
export interface ConversionOptions {
  format: string;
  quality?: number;
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  rotation?: number;
  removeBackground?: boolean;
}

// Function to convert image format
export const convertImageFormat = async (
  file: File,
  options: ConversionOptions
): Promise<File> => {
  try {
    // Create a canvas to draw the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }
    
    // Create an image element to load the file
    const img = new Image();
    const imageUrl = URL.createObjectURL(file);
    
    // Wait for the image to load
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });
    
    // Set canvas dimensions
    const width = options.width || img.width;
    const height = options.height || img.height;
    canvas.width = width;
    canvas.height = height;
    
    // Apply rotation if specified
    if (options.rotation) {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((options.rotation * Math.PI) / 180);
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
      ctx.restore();
    } else {
      ctx.drawImage(img, 0, 0, width, height);
    }
    
    // Release the object URL
    URL.revokeObjectURL(imageUrl);
    
    // Convert canvas to blob with specified format
    const mimeType = getMimeType(options.format);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob as Blob),
        mimeType,
        options.quality ? options.quality / 100 : 0.8
      );
    });
    
    // Create a new file with the converted format
    const fileName = getOutputFileName(file.name, options.format);
    return new File([blob], fileName, { type: mimeType });
  } catch (error) {
    console.error('Error converting image:', error);
    throw error;
  }
};

// Function to resize image
export const resizeImage = async (
  file: File,
  width: number,
  height: number,
  maintainAspectRatio: boolean = true
): Promise<File> => {
  try {
    const config = {
      quality: 0.8,
      maxWidth: width,
      maxHeight: height,
      autoRotate: true,
      debug: false,
      mimeType: file.type,
    };
    
    const resizedBlob = await readAndCompressImage(file, config);
    return new File([resizedBlob], file.name, { type: file.type });
  } catch (error) {
    console.error('Error resizing image:', error);
    throw error;
  }
};

// Function to compress image
export const compressImage = async (
  file: File,
  quality: number = 80
): Promise<File> => {
  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: quality / 100,
    };
    
    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name, { type: file.type });
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};

// Helper function to get MIME type from format string
const getMimeType = (format: string): string => {
  const formatMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'ico': 'image/x-icon',
    'heif': 'image/heif',
    'pdf': 'application/pdf',
  };
  
  return formatMap[format.toLowerCase()] || 'image/jpeg';
};

// Helper function to generate output filename
const getOutputFileName = (originalName: string, format: string): string => {
  const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
  return `${baseName}.${format.toLowerCase()}`;
};

// Function to get image dimensions
export const getImageDimensions = async (file: File): Promise<{width: number, height: number}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: img.width,
        height: img.height
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = objectUrl;
  });
};

// Function to process multiple images in batch
export const processBatch = async (
  files: File[],
  options: ConversionOptions
): Promise<File[]> => {
  const results: File[] = [];
  
  for (const file of files) {
    try {
      let processedFile = file;
      
      // Apply resizing if dimensions are specified
      if (options.width || options.height) {
        // Get original dimensions if needed
        let targetWidth = options.width;
        let targetHeight = options.height;
        
        if (!targetWidth || !targetHeight) {
          const dimensions = await getImageDimensions(file);
          targetWidth = options.width || dimensions.width;
          targetHeight = options.height || dimensions.height;
        }
        
        processedFile = await resizeImage(
          processedFile,
          targetWidth,
          targetHeight,
          options.maintainAspectRatio || true
        );
      }
      
      // Apply format conversion
      processedFile = await convertImageFormat(processedFile, options);
      
      results.push(processedFile);
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      // Continue with other files even if one fails
    }
  }
  
  return results;
};
