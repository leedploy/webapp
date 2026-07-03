import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { checkSession } from '@/lib/auth';

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  try {
    // 1. Authenticate user session
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check environment configuration
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_PUBLIC_URL) {
      return NextResponse.json(
        { error: 'R2 Storage variables (ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY, PUBLIC_URL) are not fully configured.' },
        { status: 500 }
      );
    }

    // 2. Parse form data
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate that it is an image
    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Uploaded file must be an image' }, { status: 400 });
    }

    // 3. Prepare file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename to prevent overwriting
    const originalName = file.name || 'image.png';
    const extension = originalName.substring(originalName.lastIndexOf('.')) || '.png';
    const cleanExtension = extension.startsWith('.') ? extension : `.${extension}`;
    const uniqueName = `notes/${user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}${cleanExtension}`;

    // 4. Upload to Cloudflare R2
    const bucketName = process.env.R2_BUCKET_NAME || 'leedapp';
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueName,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(uploadCommand);

    // 5. Construct public view URL
    const publicBaseUrl = process.env.R2_PUBLIC_URL.endsWith('/')
      ? process.env.R2_PUBLIC_URL.slice(0, -1)
      : process.env.R2_PUBLIC_URL;

    const fileUrl = `${publicBaseUrl}/${uniqueName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: uniqueName,
    });
  } catch (error) {
    console.error('Image upload handler error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', details: error.message },
      { status: 500 }
    );
  }
}
