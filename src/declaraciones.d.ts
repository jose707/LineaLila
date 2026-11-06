// Permite importar archivos PNG en TypeScript
// Soluciona el error: Cannot find module '*.png'
declare module '*.png' {
  const valor: any;
  export default valor;
}
