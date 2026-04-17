/**
 * Next.js proxy to the Theoryscope FastAPI backend.
 *
 * All requests to /api/backend/* are forwarded to http://localhost:8000/*.
 * Avoids CORS; matches the Vectorscope pattern.
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.THEORYSCOPE_BACKEND_URL ?? "http://localhost:8000";

type RouteParams = { path: string[] };

async function forward(req: NextRequest, params: Promise<RouteParams>) {
  const { path } = await params;
  const target = `${BACKEND_URL}/${path.join("/")}${req.nextUrl.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      "content-type": req.headers.get("content-type") ?? "application/json",
    },
  };

  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.text();
  }

  try {
    const backendResp = await fetch(target, init);
    const contentType =
      backendResp.headers.get("content-type") ?? "application/json";

    // Stream NDJSON straight through without buffering.
    if (contentType.includes("x-ndjson")) {
      return new NextResponse(backendResp.body, {
        status: backendResp.status,
        headers: { "content-type": contentType },
      });
    }

    const text = await backendResp.text();
    return new NextResponse(text, {
      status: backendResp.status,
      headers: { "content-type": contentType },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Theoryscope backend unreachable.",
        detail: err instanceof Error ? err.message : String(err),
        backend_url: BACKEND_URL,
      },
      { status: 503 },
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<RouteParams> }) {
  return forward(req, ctx.params);
}

export async function POST(req: NextRequest, ctx: { params: Promise<RouteParams> }) {
  return forward(req, ctx.params);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<RouteParams> }) {
  return forward(req, ctx.params);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<RouteParams> }) {
  return forward(req, ctx.params);
}
