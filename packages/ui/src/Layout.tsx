import type { ReactNode } from 'react';
import styles from './Layout.module.css';

export type LayoutProps = {
  title: string;
  children: ReactNode;
};

export function Layout({ title, children }: LayoutProps) {
  return (
    <>
      <header className={styles.header}>
        <p className={styles.title}>{title}</p>
      </header>
      <main className={styles.main}>{children}</main>
    </>
  );
}
