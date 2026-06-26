import { NextResponse } from 'next/server';
import { venues } from '@/lib/sampleData';

export async function GET() {
  return NextResponse.json({
    venues,
    source: 'mock-api-v1 / 後で公式・有料データAPIに差し替え',
    updatedAt: new Date().toISOString()
  });
}
