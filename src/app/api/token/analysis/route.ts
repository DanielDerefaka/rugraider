import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  try {
    // TODO: Implement combined token analysis
    const response = await fetch(
      `https://api.rugcheck.xyz/v1/token/analysis?address=${address}`
    );
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to analyze token" },
      { status: 500 }
    );
  }
}
