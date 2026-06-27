import { NextResponse } from 'next/server';
import { addErrorLog, listErrorLogs } from '@/repositories/errorLogRepository';

export async function GET() {
  const rows = await listErrorLogs();
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req: Request) {
  const body = await req.json();
  const row = await addErrorLog({
    level: body.level ?? 'info',
    message: String(body.message ?? ''),
    source: String(body.source ?? 'manual')
  });

  return NextResponse.json({ ok: true, data: row });
}
