export function validateBrowserPackage({
  archiveFiles,
  filename,
  readArchiveFile,
}) {
  const requiredArtifacts = [
    "dist/browser/styles.css",
    "dist/browser/super-media-picker.element.d.ts",
    "dist/browser/super-media-picker.element.js",
    "dist/browser/super-media-picker.esm.d.ts",
    "dist/browser/super-media-picker.esm.js",
    "dist/browser/super-media-picker.global.js",
  ];
  for (const artifact of requiredArtifacts) {
    if (!archiveFiles.has(artifact))
      throw new Error(`Public browser artifact is missing: ${artifact}`);
  }
  if (archiveFiles.has("dist/browser/super-media-picker.global.global.js"))
    throw new Error(
      "Public package contains the obsolete duplicated global filename",
    );

  for (const browserFile of [...archiveFiles].filter(
    (path) => path.startsWith("dist/browser/") && path.endsWith(".js"),
  )) {
    const source = readArchiveFile(filename, browserFile);
    if (
      /(?:from\s*|import\s*(?:\(\s*)?)["'](?:react|react-dom)(?:\/[^"']*)?["']/u.test(
        source,
      )
    )
      throw new Error(
        `Standalone browser artifact ${browserFile} has an external React import`,
      );
    if (/\beval\s*\(|\bnew\s+Function\b/u.test(source))
      throw new Error(
        `Standalone browser artifact ${browserFile} uses runtime code evaluation`,
      );
  }

  const globalSource = readArchiveFile(
    filename,
    "dist/browser/super-media-picker.global.js",
  );
  if (!globalSource.includes("SuperMediaPicker"))
    throw new Error("Global browser build does not install SuperMediaPicker");
}
