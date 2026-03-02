import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 text-stone-900">
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="mb-6 text-stone-600">Could not find requested resource</p>
      <Link 
        href="/"
        className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
      >
        Return Home
      </Link>
    </div>
  )
}
