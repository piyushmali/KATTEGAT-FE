/**
 * Ambient declarations for non-code imports.
 *
 * TypeScript 6 checks side-effect imports (`noUncheckedSideEffectImports`), so
 * `import './globals.css'` is an error without a module declaration for it.
 * Next's generated next-env.d.ts covers CSS *modules* but not plain stylesheet
 * side-effect imports.
 */
declare module '*.css';
