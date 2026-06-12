import * as fs from "node:fs";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

const read = (url: URL): Buffer => fs.readFileSync(url);

let ready: Promise<unknown> | undefined;

function init(): Promise<unknown> {
  if (!ready) ready = initWasm(read(new URL("./assets/resvg.wasm", import.meta.url)));
  return ready;
}

export async function svgToPng(svg: string): Promise<Buffer> {
  await init();
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: 2 },
    font: {
      loadSystemFonts: false,
      fontBuffers: [
        read(new URL("./fonts/DejaVuSans.ttf", import.meta.url)),
        read(new URL("./fonts/DejaVuSans-Bold.ttf", import.meta.url)),
        read(new URL("./fonts/DejaVuSansMono.ttf", import.meta.url)),
      ],
      defaultFontFamily: "DejaVu Sans",
      sansSerifFamily: "DejaVu Sans",
      monospaceFamily: "DejaVu Sans Mono",
    },
  });
  return Buffer.from(resvg.render().asPng());
}