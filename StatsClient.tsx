import{NextResponse}from'next/server';import{runBacktest}from'@/services/backtestService';export async function POST(){return NextResponse.json({ok:true,data:await runBacktest()})}
