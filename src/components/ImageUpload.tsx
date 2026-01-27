'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    disabled?: boolean;
    label?: string;
}

export default function ImageUpload({ value, onChange, disabled, label = "Upload Image" }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState(value);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // 5MB limit
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        setIsUploading(true);
        // Show local preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            onChange(data.url);
            setPreview(data.url);
            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload image');
            // Revert preview on error
            setPreview(value);
        } finally {
            setIsUploading(false);
        }
    };

    const triggerUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium mb-2">{label}</label>}

            <div
                onClick={disabled || isUploading ? undefined : triggerUpload}
                style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '200px',
                    backgroundColor: 'var(--background-secondary)',
                    opacity: disabled ? 0.7 : 1
                }}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={disabled || isUploading}
                />

                {preview ? (
                    <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                        <Image
                            src={preview}
                            alt="Upload preview"
                            fill
                            style={{ objectFit: 'contain' }}
                        />
                        {isUploading && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                fontWeight: 'bold'
                            }}>
                                Uploading...
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ color: 'var(--text-secondary)' }}>
                        {isUploading ? (
                            'Uploading...'
                        ) : (
                            <>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                                <p>Click to upload image</p>
                                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Max 5MB</p>
                            </>
                        )}
                    </div>
                )}
            </div>
            {preview && !isUploading && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setPreview(undefined);
                        onChange('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                        marginTop: '0.5rem',
                        fontSize: '0.8rem',
                        color: 'red',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                >
                    Remove Image
                </button>
            )}
        </div>
    );
}
