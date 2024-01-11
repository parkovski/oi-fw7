import path from 'path';
const SRC_DIR = path.resolve(__dirname, './src');
export default {
  resolve: {
    alias: {
      '@': SRC_DIR,
    },
  },
  test: {
    include: ['test/*.{js,ts}'],
  },
};
