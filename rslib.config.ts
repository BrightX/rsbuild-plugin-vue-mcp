import { defineConfig } from '@rslib/core';

const libSource = {
  entry: {
    index: './src/index.ts',
    rspack: './src/rspack.ts',
  },
}

export default defineConfig({
  lib: [
    { format: 'esm', syntax: 'es2020', dts: false, source: { entry: { 'overlay': './src/overlay.js' } } },
    {
      format: 'umd',
      syntax: 'es2018',
      dts: false,
      autoExternal: false,
      source: { entry: { 'overlay-bootstrap': './src/overlay.js' } },
      output: { target: 'web', minify: true, },
    },
    { format: 'esm', syntax: 'es2020', source: libSource, output: { target: 'node' }, dts: { distPath: 'dist/types' } },
    { format: 'cjs', syntax: 'es2020', source: libSource, output: { target: 'node' }, dts: false },
  ],
});
