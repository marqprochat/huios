import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function findTestFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTestFiles(path);
    return /\.(test|spec)\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  }));

  return nested.flat();
}

describe('Expo Router boundary', () => {
  it('keeps test modules outside the app route tree', async () => {
    const files = await findTestFiles(join(process.cwd(), 'app'));

    expect(files).toEqual([]);
  });
});
