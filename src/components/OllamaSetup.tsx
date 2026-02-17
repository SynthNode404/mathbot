import React from 'react';
import { ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

export default function OllamaSetup() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Ollama Required for AI Features
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-4">
              MathBot needs Ollama to run AI models locally. It's a one-time setup that takes 2 minutes.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-300">1</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Download Ollama</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500 underline flex items-center gap-1">
                ollama.ai <ExternalLink className="w-3 h-3" />
              </a> and download the macOS version
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-300">2</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Install Ollama</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Open the downloaded file and drag Ollama to Applications
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-300">3</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Download Models</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Open Terminal and run:
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-3 mt-2 font-mono text-sm">
              <div>ollama pull qwen2.5:7b</div>
              <div>ollama pull llava</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              This downloads ~4GB of data. One-time only.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-300" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Start Using MathBot!</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Refresh this page and start solving math problems
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Why Ollama?</strong> It keeps your data private and runs entirely on your Mac. 
          No API keys, no subscriptions, no internet required for math solving.
        </p>
      </div>
    </div>
  );
}
