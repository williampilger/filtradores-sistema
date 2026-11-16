/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.16 - Tipos dos assets estáticos importados (o Metro resolve `import x from './a.png'` para o id do asset)
 */
declare module '*.png' {
    const asset: number;
    export default asset;
}
