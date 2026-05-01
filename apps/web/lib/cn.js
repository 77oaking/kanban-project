import clsx from 'clsx';

// Wrapper kept simple: we don't pull in tailwind-merge to keep the dep tree
// light. Components avoid conflicting class names by construction.
export const cn = (...args) => clsx(...args);
