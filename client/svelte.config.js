import sveltePreprocess from 'svelte-preprocess';

const config = {
  preprocess: sveltePreprocess(),
  compilerOptions: {
    css: {
      warnUnused: false
    }
  }
};

export default config;