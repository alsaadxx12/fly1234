import { useState } from 'react';
import axios from 'axios';

const MAX_IMAGE_SIZE_MB = 5;

export default function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadImage = async (file: File): Promise<string> => {
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      throw new Error(`حجم الصورة يجب أن يكون أقل من ${MAX_IMAGE_SIZE_MB} ميجابايت`);
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Simulate upload for now
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setIsUploading(false);
          resolve(reader.result as string);
        };
        reader.onerror = () => {
          setIsUploading(false);
          setUploadError('فشل في قراءة الملف');
          throw new Error('فشل في قراءة الملف');
        };
        reader.readAsDataURL(file);
      });
      
    } catch (error) {
      console.error('Image upload error:', error);
      const message = error instanceof Error ? error.message : 'فشل رفع الصورة';
      setUploadError(message);
      setIsUploading(false);
      throw new Error(message);
    }
  };

  return {
    uploadImage,
    isUploading,
    uploadError,
  };
}
