import { NextResponse } from 'next/server';
import { requireManagerSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { TOOL_REGISTRY, type ToolRegistryEntry } from '@/data/toolRegistry';

export async function GET() {
  // Server-side authentication and authorization check
  const session = await requireManagerSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized: Manager access required.' },
      { status: 403 }
    );
  }

  const db = getDb();

  interface ToolItem {
    slug: string;
    name: string;
    category: string;
    count: number;
  }

  // Combine known tools from registry with recorded usage
  const toolList: ToolItem[] = TOOL_REGISTRY.map((t: ToolRegistryEntry) => ({
    slug: t.slug,
    name: t.name,
    category: t.category,
    count: db.toolUsage[t.slug] || 0,
  }));

  // Also include any other recorded slugs that might not be in TOOL_REGISTRY
  const knownSlugs = new Set(toolList.map((t: ToolItem) => t.slug));
  for (const [slug, count] of Object.entries(db.toolUsage)) {
    if (!knownSlugs.has(slug)) {
      toolList.push({
        slug,
        name: slug,
        category: 'other',
        count,
      });
    }
  }

  // Sort tools by usage descending
  toolList.sort((a: ToolItem, b: ToolItem) => b.count - a.count);

  const totalToolUses = Object.values(db.toolUsage).reduce((acc: number, curr: number) => acc + curr, 0);

  return NextResponse.json({
    totalUsers: db.users.length,
    users: db.users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isManager: u.role === 'manager' || u.email.toLowerCase() === session.email.toLowerCase(),
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    })),
    totalToolUses,
    toolUsage: toolList,
    recentEvents: db.events.slice(0, 50),
    authenticatedAs: session.email,
  });
}
