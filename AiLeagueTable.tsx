import{NextResponse}from'next/server';export async function GET(){return NextResponse.json({ok:true,data:{service:'Boat AI',version:'2.0',time:new Date().toISOString()}})}
