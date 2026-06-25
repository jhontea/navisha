// Tell TypeScript that CSS files are valid side-effect imports
declare module '*.css' {
  const content: Record<string, string>
  export default content
}

// Google Maps JS API global — loaded at runtime by @vis.gl/react-google-maps.
// This prevents TS from complaining about `google.maps.*` usages in map files.
declare const google: typeof import('@types/google.maps')
interface Window {
  google: typeof google
}
