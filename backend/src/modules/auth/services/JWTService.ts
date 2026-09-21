import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export class JWTService {

    generate(userId: string) {
        return jwt.sign(
            { userId },
            JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );
    }

    verify(token: string) {
        return jwt.verify(
            token,
            JWT_SECRET,
        ) as {
            userId: string;
        };
    }

}