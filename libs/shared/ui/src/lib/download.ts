/**
 * Turn an in-memory payload into a browser download. Single source so every
 * export button (CSV templates, reports, …) behaves identically and the
 * backend only has to return { filename, mimeType, content }. Lives in
 * @app/ui because it touches the DOM (@app/utils is DOM-free).
 */
export function triggerDownload(payload: {
  filename: string;
  mimeType: string;
  content: string;
}): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([payload.content], { type: payload.mimeType });
  triggerBlobDownload(blob, payload.filename);
}

/**
 * Save an already-fetched Blob (e.g. a document downloaded from a presigned
 * URL) as a browser download under `filename`. Same anchor-click mechanism as
 * {@link triggerDownload}, but for binary payloads the caller already holds.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
