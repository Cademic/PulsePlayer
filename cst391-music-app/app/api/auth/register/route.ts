import { NextResponse } from "next/server";
import {
  createUserWithPassword,
  getUserByEmailForAuth,
} from "@/lib/user-repository";
import { hashPassword } from "@/lib/password";

interface RegisterBody {
  email?: string;
  name?: string;
  password?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");

    if (!email || !name || !password) {
      return NextResponse.json(
        { message: "Email, name, and password are required." },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { message: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmailForAuth(email);
    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUserWithPassword({
      email,
      name,
      passwordHash,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json(
      { message: "Unable to create account. Please try again." },
      { status: 500 }
    );
  }
}
