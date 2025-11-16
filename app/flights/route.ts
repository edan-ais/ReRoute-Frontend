// app/api/flights/route.ts
import { NextResponse } from "next/server";

const BASE_URL = process.env.FLIGHT_API_BASE_URL;
const API_KEY = process.env.FLIGHT_API_KEY;

/**
 * GET /api/flights
 *
 * Proxies to your external provider /v1/flights endpoint.
 * Passes through query params like ?flight_date=YYYY-MM-DD if you want.
 */
export async function GET(req: Request) {
  if (!BASE_URL || !API_KEY) {
    return NextResponse.json(
      { error: "FLIGHT_API_BASE_URL or FLIGHT_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const incomingUrl = new URL(req.url);
  const externalUrl = new URL(`${BASE_URL}/v1/flights`);

  // Pass through query params (flight_date, etc.)
  incomingUrl.searchParams.forEach((value, key) => {
    externalUrl.searchParams.set(key, value);
  });

  try {
    const res = await fetch(externalUrl.toString(), {
      headers: {
        // Adjust this header according to your provider's requirements
        Authorization: `Bearer ${API_KEY}`
      },
      cache: "no-store"
    });

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error fetching flights:", err);
    return NextResponse.json({ error: "Failed to fetch flights" }, { status: 500 });
  }
}
