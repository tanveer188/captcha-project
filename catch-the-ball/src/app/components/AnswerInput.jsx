import { Button } from "@/components/ui/button";

export default function AnswerInput({ value, onChange, onSubmit, disabled }) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="answer"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Your Answer
        </label>
        <textarea
          id="answer"
          rows={4}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your answer here..."
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
      <Button
        onClick={onSubmit}
        disabled={disabled}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        Submit Answer
      </Button>
    </div>
  );
}