"use client";

export function sanitizeDownloadFilename(name: string): string {
  const base = name.trim() || "dessin";
  const slug = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "dessin";
}

export function buildSvgDownloadFilename(name: string): string {
  return `${sanitizeDownloadFilename(name)}.svg`;
}

export function downloadSvgFile(svg: string, filename: string): void {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
