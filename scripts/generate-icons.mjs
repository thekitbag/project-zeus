import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public", "johnson.jpeg");

for (const size of [192, 512]) {
  await sharp(src)
    .resize(size, size, { fit: "cover", position: "top" })
    .png()
    .toFile(path.join(root, "public", `icon-${size}.png`));
  console.log(`icon-${size}.png written`);
}
