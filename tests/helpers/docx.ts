import { inflateRawSync } from "node:zlib";

export function documentXml(zip: Buffer) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  for (let offset = zip.readUInt32LE(end + 16); zip.readUInt32LE(offset) === 0x02014b50;) {
    const nameLength = zip.readUInt16LE(offset + 28);
    const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString();
    if (name === "word/document.xml") {
      const local = zip.readUInt32LE(offset + 42);
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const compressed = zip.subarray(start, start + zip.readUInt32LE(offset + 20));
      return (zip.readUInt16LE(offset + 10) === 8 ? inflateRawSync(compressed) : compressed).toString();
    }
    offset += 46 + nameLength + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
  }
  throw new Error("DOCX document.xml is missing");
}
