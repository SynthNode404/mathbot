#!/bin/bash

# mathbot launcher
echo "starting mathbot..."

# check if ollama is running, start it if not
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "starting ollama..."
  open -a Ollama
  sleep 3
fi

# pull models if not already downloaded
echo "checking models..."
ollama pull qwen2.5:7b 2>/dev/null &
ollama pull llava 2>/dev/null &
wait

echo "models ready"

cd "$(dirname "$0")"

# start the app
npm run dev
