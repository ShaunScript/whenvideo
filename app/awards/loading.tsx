export default function AwardsLoading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400">Loading awards...</p>
      </div>
    </div>
  )
}
