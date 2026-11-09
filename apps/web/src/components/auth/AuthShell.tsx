import type { ReactNode } from 'react';

/** Split auth layout with a dark illustration panel on large screens. */
export function AuthShell({ image, children, contentClassName = '' }: {
  image: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-4 sm:px-6"
      style={{ background: 'var(--bg-base)' }}>
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl lg:grid-cols-2"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}>
        <aside aria-hidden="true" className="relative hidden overflow-hidden lg:block lg:row-start-1 lg:col-start-1"
          style={{ background: '#08201a' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: 'center' }} />
        </aside>
        <main className={`flex items-center justify-center px-5 py-5 sm:px-8 lg:col-start-2 lg:row-start-1 ${contentClassName}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
