import type { LinkRenderer } from '@agenda/ui';
import { Link } from 'react-router';

export const routerLink: LinkRenderer = ({ href, className, children }) => (
  <Link to={href} className={className}>
    {children}
  </Link>
);
