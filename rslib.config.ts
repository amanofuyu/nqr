import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      autoExtension: false,
      output: {
        filename: {
          js: '[name].mjs',
        },
      },
      dts: {
        bundle: true,
      },
    },
    {
      format: 'cjs',
      autoExtension: false,
      output: {
        filename: {
          js: '[name].cjs',
        },
      },
    },
    {
      format: 'umd',
      umdName: 'NQR',
      autoExtension: false,
      output: {
        filename: {
          js: '[name].js',
        },
        // 覆盖默认值，即可实现压缩？
        minify: {},
      },
    },
  ],
  output: {
    target: 'web',
  },
});
