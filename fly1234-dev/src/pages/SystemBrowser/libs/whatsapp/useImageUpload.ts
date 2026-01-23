import { useState } from 'react';
import axios from 'axios';

export default function useImageUpload() {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const clearSelectedImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
    };

    const uploadImageWithRetry = async (file: File, account: { instance_id: string; token: string }, retries = 3): Promise<string> => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('token', account.token);

        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.post(
                    `https://api.ultramsg.com/${account.instance_id}/media/upload`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                if (response.data.url) {
                    setIsUploading(false);
                    return response.data.url;
                }
                throw new Error('No URL in response');
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        setIsUploading(false);
        throw new Error('Upload failed after retries');
    };

    return {
        selectedImage,
        imagePreview,
        handleImageChange,
        clearSelectedImage,
        uploadImageWithRetry,
        isUploading
    };
}
