'use client';

interface Step {
  id: number;
  name: string;
  description: string;
}

interface FormStepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
}

export default function FormStepIndicator({
  steps,
  currentStep,
  onStepClick,
}: FormStepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="overflow-x-auto pb-4">
      <ol className="flex items-start justify-between min-w-max px-4">
        {steps.map((step, stepIdx) => (
          <li
            key={step.name}
            className="relative flex flex-col items-center flex-1"
            style={{ minWidth: '100px' }}
          >
            {/* Connecting Line */}
            {stepIdx !== steps.length - 1 && (
              <div
                className="absolute top-4 left-1/2 w-full h-0.5 -z-0"
                aria-hidden="true"
                style={{ marginLeft: '16px' }}
              >
                <div
                  className={`h-full ${
                    step.id < currentStep ? 'bg-[#41b6e6]' : 'bg-gray-200'
                  }`}
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              className={`group relative flex flex-col items-center ${
                step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
            >
              {/* Circle */}
              <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full mb-2" aria-hidden="true">
                <span
                  className={`flex h-full w-full items-center justify-center rounded-full transition-all ${
                    step.id < currentStep
                      ? 'bg-[#41b6e6] group-hover:bg-[#3aa5d5]'
                      : step.id === currentStep
                      ? 'border-2 border-[#41b6e6] bg-white'
                      : 'border-2 border-gray-300 bg-white'
                  }`}
                >
                  {step.id < currentStep ? (
                    <svg
                      className="h-5 w-5 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        step.id === currentStep ? 'bg-[#41b6e6]' : 'bg-transparent'
                      }`}
                    />
                  )}
                </span>
              </span>

              {/* Step Name Below Circle */}
              <span className="text-center max-w-[100px]">
                <span
                  className={`block text-xs font-semibold ${
                    step.id <= currentStep ? 'text-[#41b6e6]' : 'text-[#5b6068]'
                  }`}
                >
                  {step.name}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}