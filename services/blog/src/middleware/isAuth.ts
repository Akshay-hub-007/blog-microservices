import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken"
export interface IUser extends Document {
    _id: string;
    name: string;
    email: string;
    image: string;
    instagram: string;
    facebook: string;
    linkedin: string;
    bio: string;
}
export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}
const isAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log("object")
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                message: "Please Login - No auth header",
            });
            return;
        }
        const token = authHeader.split(" ")[1]
        const decodeValue = jwt.verify(
            token as string,
            process.env.JWT_SEC as string
        ) as JwtPayload;

        if (!decodeValue || !decodeValue.user) {
            res.status(401).json({
                message: "Invalid token",
            });
            return;
        }

        req.user = decodeValue.user;
        next();
    } catch (error) {
        console.log("JWT verification error: ", error);
        res.status(401).json({
            message: "Please Login - Jwt error",
        });
    }


}

export default isAuth