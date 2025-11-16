// app/api/flights/route.ts
import { NextResponse } from "next/server";

const BASE_URL = process.env.AVIATIONSTACK_BASE_URL;
const API_KEY = process.env.AVIATIONSTACK_API_KEY;

export async function GET(req: Request) {
  if (!BASE_URL || !API_KEY) {
    return NextResponse.json(
      { error: "Missing AviationStack configuration" },
      { status: 500 }
    );
  }

  const incomingUrl = new URL(req.url);

  // Build external request URL
  const externalUrl = new URL(`${BASE_URL}/flights`);
  externalUrl.searchParams.set("access_key", API_KEY);

  // Pass through filters (flight_date, airline, dep_iata, etc.)
  incomingUrl.searchParams.forEach((val, key) => {
    externalUrl.searchParams.set(key, val);
  });

  try {
    const response = await fetch(externalUrl.toString(), {
      method: "GET",
      cache: "no-store"
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[AviationStack Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch from AviationStack" },
      { status: 500 }
    );
  }
}

