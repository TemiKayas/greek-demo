'use client';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface Quiz {
  questions: QuizQuestion[];
}

interface QuizDisplayProps {
  quiz: Quiz;
}

export default function QuizDisplay({ quiz }: QuizDisplayProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6">Generated Quiz</h2>

      <div className="space-y-6">
        {quiz.questions.map((q, index) => (
          <div key={index} className="border-b pb-4 last:border-b-0">
            <div className="flex gap-2 mb-3">
              <span className="font-semibold text-blue-600">Q{index + 1}.</span>
              <p className="font-medium">{q.question}</p>
            </div>

            <div className="ml-8 space-y-2">
              {q.options.map((option, optIndex) => {
                const isCorrect = option === q.answer;
                return (
                  <div
                    key={optIndex}
                    className={`p-2 rounded ${
                      isCorrect
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-500">
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      <span>{option}</span>
                      {isCorrect && (
                        <span className="ml-auto text-green-600 text-sm font-semibold">
                          ✓ Correct
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {q.explanation && (
              <div className="ml-8 mt-3 p-3 bg-blue-50 rounded text-sm">
                <span className="font-semibold text-blue-900">Explanation: </span>
                <span className="text-blue-800">{q.explanation}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create Game from Quiz
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          Edit Quiz
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          Export Quiz
        </button>
      </div>
    </div>
  );
}
