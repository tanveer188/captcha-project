export default function PuzzleDisplay({ puzzle }) {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Puzzle</h2>
          <div className="whitespace-pre-wrap">{puzzle}</div>
        </div>
      </div>
    );
  }