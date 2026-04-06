import React from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function downloadZip(files: Record<string, string>, projectName: string) {
  const zip = new JSZip();
  
  // Base configuration files
  zip.file('package.json', JSON.stringify({
    name: projectName.replace(/\s+/g, '-').toLowerCase() || 'nexus-generated-project',
    version: '1.0.0',
    scripts: { "dev": "next dev", "build": "next build", "start": "next start" },
    dependencies: { "react": "^18", "next": "latest", "tailwindcss": "latest" }
  }, null, 2));
  
  // Add all generated files mapping
  Object.keys(files).forEach((path) => {
    zip.file(path, files[path]);
  });
  
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, (projectName.replace(/\\s+/g, '-').toLowerCase() || 'project') + '.zip');
}
