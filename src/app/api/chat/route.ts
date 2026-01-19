import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, dataContext } = await req.json();

  const result = streamText({
    model: google('gemini-1.5-pro'),
    messages,
    system: `
      你是一位專業的財務與營運分析專家，專門協助「台北市兒童新樂園」內部的 XR 樂園店面。
      你的目標是根據提供的數據，給出精準的營運建議、財務解釋以及行銷策略。
      
      以下是當前的數據 Context (JSON 格式):
      ${JSON.stringify(dataContext)}
      
      請注意：
      1. 僅針對提供的數據進行回答。
      2. 語氣要專業、友善且具備商業洞察力。
      3. 若數據顯示營收下降，請嘗試從數據中分析可能原因 (例如人均客單價 ATV 下降，或是特定日期人潮銳減)。
      4. 針對兒童新樂園的特殊客群 (校外教學、10歲以下家庭) 提供轉化策略。
      你應優先利用 dataContext 中的 yearPivotData (包含 2024/2025 歷史數據與 2026 目標預測) 來進行趨勢對比。
      6. 你的回答應包含 Markdown 格式，適時使用表格或列表。
    `,
  });

  return result.toTextStreamResponse();
}
