import { NextResponse } from 'next/server';
import { getNotificationSetting, updateNotificationSetting } from '@/services/notificationService';

export async function GET() {
  return NextResponse.json({ ok: true, data: await getNotificationSetting() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const data = await updateNotificationSetting({
    lineEnabled: Boolean(body.lineEnabled),
    emailEnabled: Boolean(body.emailEnabled),
    minExpectedValue: Number(body.minExpectedValue ?? 120),
    minConfidence: Number(body.minConfidence ?? 70)
  });

  return NextResponse.json({ ok: true, data });
}
