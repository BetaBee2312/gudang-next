import sharp from "sharp";

const MAX_OUTPUT_BYTES = 900 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;

// Mulai dari kualitas tinggi, lalu turunkan resolusi hanya bila ukuran belum cukup kecil.
const ENCODING_PRESETS = [
  { size: 1200, quality: 82 },
  { size: 1200, quality: 72 },
  { size: 1200, quality: 62 },
  { size: 1200, quality: 52 },
  { size: 1000, quality: 62 },
  { size: 900, quality: 58 },
  { size: 800, quality: 54 },
  { size: 720, quality: 50 },
  { size: 640, quality: 46 },
  { size: 560, quality: 42 },
  { size: 480, quality: 38 },
] as const;

/**
 * Normalisasi foto menjadi JPEG persegi 1:1.
 * EXIF orientation diperbaiki, area dipotong dengan titik fokus otomatis,
 * transparansi diratakan ke putih, dan ukuran akhir dijaga di bawah 1 MB.
 */
export async function compressSquareJpeg(input: Buffer): Promise<Buffer> {
  if (!input.length) throw new Error("File gambar kosong.");

  // Terapkan orientasi kamera lebih dulu agar hitungan crop memakai dimensi aktual.
  const oriented = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .toBuffer();
  const metadata = await sharp(oriented).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Dimensi gambar tidak dapat dibaca.");
  }

  // Crop menjadi persegi sebelum resize. Ini tetap 1:1 bahkan untuk foto kecil.
  const squareSide = Math.min(metadata.width, metadata.height);
  const squareInput = await sharp(oriented)
    .resize(squareSide, squareSide, {
      fit: "cover",
      position: "attention",
      withoutEnlargement: true,
    })
    .toBuffer();

  for (const preset of ENCODING_PRESETS) {
    const output = await sharp(squareInput)
      .resize(preset.size, preset.size, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({
        quality: preset.quality,
        mozjpeg: true,
        chromaSubsampling: "4:2:0",
        progressive: true,
      })
      .toBuffer();

    if (output.length < MAX_OUTPUT_BYTES) return output;
  }

  throw new Error("Gambar gagal dikompres menjadi di bawah 1 MB. Pilih gambar lain.");
}
