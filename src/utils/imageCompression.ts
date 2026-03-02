// src/utils/imageCompression.ts
import { Image as ImageInfo } from 'react-native-image-picker';

/**
 * Compress an image file by reducing its size
 * Useful for reducing upload time when dealing with large image files from the camera
 */
export const compressImage = async (imageUri: string): Promise<string> => {
  try {
    // If the image is from gallery/camera, we'll use the URI directly
    // The compression could be done on the backend instead, but for now
    // we'll just validate that the URI is usable

    if (!imageUri || !imageUri.startsWith('file://')) {
      console.warn('Invalid image URI for compression:', imageUri);
      return imageUri;
    }

    // In a real scenario, you would use a library like react-native-image-resizer
    // For now, we return the original URI
    // TODO: Implement actual compression using react-native-image-resizer
    return imageUri;
  } catch (error) {
    console.error('Error compressing image:', error);
    return imageUri; // Return original if compression fails
  }
};

/**
 * Compress multiple images in parallel
 */
export const compressImages = async (
  imageUris: string[],
): Promise<string[]> => {
  try {
    const compressed = await Promise.all(
      imageUris.map(uri => compressImage(uri)),
    );
    return compressed;
  } catch (error) {
    console.error('Error compressing images:', error);
    return imageUris; // Return originals if compression fails
  }
};
