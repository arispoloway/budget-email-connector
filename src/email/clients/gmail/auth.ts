import { promises as fs } from "fs";
import path from "path";
import readline from "readline";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = path.join(process.cwd(), "token.json");

export async function authorize() {
  const credentials = JSON.parse(await fs.readFile("credentials.json", "utf8"));
  const { client_secret, client_id, redirect_uris } = credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris,
  );

  // Try to load existing token
  try {
    const token = await fs.readFile(TOKEN_PATH, "utf8");
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } catch {
    return getNewToken(oAuth2Client);
  }
}

async function getNewToken(oAuth2Client: any) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this URL:", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code: string = await new Promise((resolve) => {
    rl.question("Enter the code from that page here: ", (input) => {
      rl.close();
      resolve(input);
    });
  });

  const tokenResponse = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokenResponse.tokens);

  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokenResponse.tokens));
  console.log("Token stored to", TOKEN_PATH);

  return oAuth2Client;
}
