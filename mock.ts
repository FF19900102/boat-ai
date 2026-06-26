import{NextResponse}from'next/server';export async function GET(){return new NextResponse('id,raceId,combination,stake,payout\n',{headers:{'content-type':'text/csv'}})}
