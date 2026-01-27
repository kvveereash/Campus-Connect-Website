import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // Validation: Allow images, PDFs, Word docs, Text
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // Simple check: Allow if image or in list
    if (!file.type.startsWith('image/') && !allowedTypes.includes(file.type)) {
        return NextResponse.json({ success: false, error: 'File type not supported. Allowed: Images, PDF, Word, Text' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const publicPath = path.join(process.cwd(), 'public');
    const uploadsPath = path.join(publicPath, 'uploads');

    try {
        await mkdir(uploadsPath, { recursive: true });
    } catch (e) {
        // Ignore error if directory exists
    }

    // Create unique filename
    const timestamp = Date.now();
    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    const filePath = path.join(uploadsPath, filename);

    try {
        await writeFile(filePath, buffer);
        // Return relative path for public access
        const publicUrl = `/uploads/${filename}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('Upload failed:', error);
        return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
    }
}
