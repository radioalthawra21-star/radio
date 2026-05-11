// Declare that all CSS files can be imported as CSS modules
declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// Declare that all SCSS files can be imported as CSS modules
declare module '*.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

// Declare that all JSX files can be imported as React components
declare module '*.jsx' {
  const value: React.ComponentType<any>;
  export default value;
}

// Declare that all TSX files can be imported as React components
declare module '*.tsx' {
  const value: React.ComponentType<any>;
  export default value;
}

// Allow importing images
declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.jpeg' {
  const value: any;
  export default value;
}

declare module '*.svg' {
  const value: any;
  export default value;
}