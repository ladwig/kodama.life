import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { email, phone } = await req.json();

        // Basic server-side validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
        }

        // Auth via service account credentials stored in env vars
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            },
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const sheets = google.sheets({ version: "v4", auth });

        const timestamp = new Date().toISOString();

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: "Sheet1!A:C",
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [[timestamp, email, phone || ""]],
            },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Signup API error:", err);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
}
