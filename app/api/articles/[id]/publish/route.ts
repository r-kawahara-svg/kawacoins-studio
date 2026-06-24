import { NextRequest, NextResponse } from "next/server";
import { publishArticleById, PublishError } from "@/lib/publish";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const result = await publishArticleById(id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof PublishError) {
      return NextResponse.json({ error: e.userMessage }, { status: e.statusCode });
    }
    throw e;
  }
}
