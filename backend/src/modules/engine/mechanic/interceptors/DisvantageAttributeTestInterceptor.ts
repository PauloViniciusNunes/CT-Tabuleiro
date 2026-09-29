import { AttributeTestMultiplierInterceptor } from "./AttributeTestMultiplierInterceptor";

/** Attribute-specific 50% specialization kept for existing mechanics. */
export class DisvantageAttributeTestInterceptor extends AttributeTestMultiplierInterceptor {
    constructor(attribute: "consistencia" | "destreza") {
        super(attribute, 0.5);
    }
}
