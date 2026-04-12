declare module "text-to-svg" {
  interface Options {
    x?: number;
    y?: number;
    fontSize?: number;
    anchor?: string;
    attributes?: Record<string, string>;
  }

  interface TextToSVG {
    getD(text: string, options?: Options): string;
  }

  const TextToSVG: {
    loadSync(fontPath?: string): TextToSVG;
  };

  export default TextToSVG;
}