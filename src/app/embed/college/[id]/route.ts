import { embedResponse } from '@/lib/embed';

/* A standalone HTML document, not a page: the root layout's navbar and
   scripts must not land inside someone else's website. See src/lib/embed.ts. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return embedResponse('college', id, request.url);
}
