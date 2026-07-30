import { mkdir, readdir, rename, writeFile } from 'node:fs/promises';

const worker = `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const url = new URL(request.url);
    url.pathname = '/index.html';
    return env.ASSETS.fetch(new Request(url, request));
  }
};
`;

await mkdir('dist/client', { recursive: true });

for (const entry of await readdir('dist', { withFileTypes: true })) {
  if (entry.name === 'client' || entry.name === 'server' || entry.name === '.openai') continue;
  await rename(`dist/${entry.name}`, `dist/client/${entry.name}`);
}

await mkdir('dist/server', { recursive: true });
await writeFile('dist/server/index.js', worker);
