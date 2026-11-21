import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-2xl font-bold text-crm-navy dark:text-white">404 - Page Not Found</h2>
      <p className="mt-2 text-sm text-crm-indigo dark:text-crm-lightGrey">
        The requested page could not be found.
      </p>
      <Link
        href="/outreach"
        className="mt-4 px-4 py-2 rounded-lg bg-crm-blue text-white font-medium text-xs hover:bg-crm-blue/90 transition"
      >
        Return to Outreach Hub
      </Link>
    </div>
  );
}
