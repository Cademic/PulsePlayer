import { NextResponse } from "next/server";
import { checkDatabaseConnection, getFirstArtist } from "@/lib/db";

export async function GET() {
  try {
    const { isConnected } = await checkDatabaseConnection();

    if (!isConnected) {
      return NextResponse.json(
        {
          status: "error",
          message: "Unable to verify database connection.",
        },
        { status: 500 }
      );
    }

    const sampleArtist = await getFirstArtist();
    const author = process.env.DB_CHECK_AUTHOR ?? "Your Name";

    return NextResponse.json({
      status: "ok",
      message: "Database connection successful.",
      author,
      sampleArtist: sampleArtist ?? "(no albums yet)",
    });
  } catch (error) {
    console.error("Database connection check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
