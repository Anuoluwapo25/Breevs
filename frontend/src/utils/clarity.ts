import { ClarityValue, cvToJSON } from "@stacks/transactions";

export function clarityToJSON(cv: ClarityValue) {
  const json = cvToJSON(cv);

  function normalize(obj: any): any {
    if (obj && typeof obj === "object" && "type" in obj && "value" in obj) {
      switch (obj.type) {
        case "uint":
          return Number(obj.value);
        case "bool":
          return obj.value === true;
        case "optional":
          return obj.value ? normalize(obj.value) : null;
        default:
          return obj.value;
      }
    }
    if (Array.isArray(obj)) {
      return obj.map((i) => normalize(i));
    }
    if (obj && typeof obj === "object") {
      const out: any = {};
      for (const k in obj) {
        out[k] = normalize(obj[k]);
      }
      return out;
    }
    return obj;
  }

  return normalize(json);
}
