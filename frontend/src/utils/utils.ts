export const sanitizeFileName = (name: string | undefined | null, fallback: string) => {
  const trimmed = (name && name.trim()) || fallback;
  const sanitized = trimmed.replace(/[^a-z0-9_-]+/gi, '_');
  return sanitized || fallback;
};

export const triggerDownload = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};