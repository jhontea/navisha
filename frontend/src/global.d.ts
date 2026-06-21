// Tell TypeScript that CSS files are valid side-effect imports
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
