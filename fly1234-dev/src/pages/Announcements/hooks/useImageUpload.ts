import React from 'react';
import axios from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const MAX_IMAGE_SIZE = 16 * 1024 * 1024;
const UPLOAD_TIMEOUT = 60000;

export default function useImageUpload() {
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const uploadImageWithRetry = async (image: File, account: { instance_id: string; token: string }, retryCount = 0): Promise<string> => {
    if (image.size > MAX_IMAGE_SIZE) {
      throw new Error(`Image size is too large. Max size is ${MAX_IMAGE_SIZE / (1024 * 1024)} MB`);
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('token', account.token);
      formData.append('file', image);
      formData.append('filename', image.name);
      
      const imageResponse = await axios.post(
        `https://api.ultramsg.com/${account.instance_id}/media/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: UPLOAD_TIMEOUT,
        }
      );

      if (!imageResponse?.data?.success) {
        throw new Error(imageResponse.data.error || 'Failed to get image URL');
      }

      return imageResponse.data.success;
    } catch (error: any) {
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return uploadImageWithRetry(image, account, retryCount + 1);
      }
      throw new Error(`Failed to upload image: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };
  
  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };
  
  return {
    selectedImage,
    imagePreview,
    setImagePreview,
    handleImageChange,
    clearSelectedImage,
    uploadImageWithRetry,
    isUploading,
    uploadError
  };
}
