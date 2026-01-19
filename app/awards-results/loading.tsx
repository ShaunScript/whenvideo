export default function AwardsResultsLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600 mb-4" />
        <p className="text-white text-lg">Loading results...</p>
      </div>
    </div>
  )
}
