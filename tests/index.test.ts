import { expect, test } from 'vitest';
import { renderImage } from '../src/image';

test('renderImage', async () => {
  const file = await renderImage('https://github.com/nqr', {
    pixelSize: 20,
    pixelStyle: 'Rounded',
  });
  expect(file).toBeInstanceOf(File);
});
