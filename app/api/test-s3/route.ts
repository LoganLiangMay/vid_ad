import { NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/aws/s3';

export async function GET() {
  try {
    // Create a simple test file
    const testContent = `Test upload at ${new Date().toISOString()}`;
    const buffer = Buffer.from(testContent);

    // Upload to S3
    const result = await uploadToS3(
      buffer,
      'test/test-upload.txt',
      'text/plain',
      {
        testUpload: 'true',
        timestamp: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      success: true,
      message: 'S3 upload test successful!',
      result,
    });
  } catch (error: any) {
    console.error('S3 test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
