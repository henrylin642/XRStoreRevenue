
import { NextRequest, NextResponse } from 'next/server';
import { mergeExcelData } from '@/lib/data-manager';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await mergeExcelData(buffer);

        return NextResponse.json({
            success: true,
            message: `成功匯入 ${result.added} 筆新資料 (忽略 ${result.duplicates} 筆重複資料)`,
            ...result
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}
