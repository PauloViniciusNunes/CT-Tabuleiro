import { z } from "zod";

export const TokenIdValidator = z.string().min(1);
