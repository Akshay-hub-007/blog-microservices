import {google} from "googleapis"
import dotenv from "dotenv"

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.Google_Client_id
const GOOGLE_SECRET_ID = process.env.Google_client_secret

export const  oauthclient = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_SECRET_ID,
    "postmessage"
)