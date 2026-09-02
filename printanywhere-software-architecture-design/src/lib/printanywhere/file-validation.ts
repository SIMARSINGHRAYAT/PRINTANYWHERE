import { fileTypeFromBuffer } from "file-type";
import { PDFDocument } from "pdf-lib";
import { MAX_UPLOAD_BYTES, SUPPORTED_EXTENSIONS } from "@/lib/printanywhere/constants";

export type SupportedFileKind = "pdf" | "png" | "jpg" | "jpeg";

export type ValidationResult = {
  kind: SupportedFileKind;
  extension: SupportedFileKind;
  mime: string;
  size: number;
};

function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("utf8") === "%PDF-";
}

export async function validateUploadedFile(input: {
  buffer: Buffer;
  declaredMime: string;
}): Promise<ValidationResult> {
  const { buffer } = input;

  if (buffer.byteLength === 0) {
    throw new Error("Empty file");
  }

  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("File too large");
  }

  const sniffed = await fileTypeFromBuffer(buffer);

  let extension: SupportedFileKind | null = null;
  let mime = "application/octet-stream";

  if (sniffed?.ext) {
    const ext = sniffed.ext.toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(ext)) {
      extension = ext as SupportedFileKind;
      mime = sniffed.mime;
    }
  }

  if (!extension && hasPdfSignature(buffer)) {
    extension = "pdf";
    mime = "application/pdf";
  }

  if (!extension) {
    throw new Error("Unsupported file type");
  }

  if (extension === "pdf") {
    try {
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: false });
      if (pdf.getPageCount() < 1) {
        throw new Error("Invalid PDF");
      }
    } catch {
      throw new Error("Invalid PDF file");
    }
  }

  return {
    kind: extension,
    extension,
    mime,
    size: buffer.byteLength,
  };
}
