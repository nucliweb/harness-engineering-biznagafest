import type { ReactNode } from 'react';

export type LinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

/** Lets the host app supply its own router link. Defaults to a plain anchor. */
export type LinkRenderer = (props: LinkProps) => ReactNode;

export const anchorLink: LinkRenderer = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);
