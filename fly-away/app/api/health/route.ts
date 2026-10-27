import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamics';
export async function GET() {
    return NextResponse.json (
        {
            status: 'UP',
            timestamp: new Date().toISOString(),
            version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknow'
        },
        { status: 200 }
    )
}