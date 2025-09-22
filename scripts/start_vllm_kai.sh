#!/usr/bin/env bash
set -euo pipefail

MODEL=${1:-meta-llama/Meta-Llama-3-8B-Instruct}
PORT=${PORT:-8000}
CTX=${CTX:-4096}
DTYPE=${DTYPE:-auto}

cat <<EOF
Starting vLLM OpenAI-compatible server
 Model: $MODEL
 Port:  $PORT
 Ctx:   $CTX
 DType: $DTYPE
EOF

# Recommend creating a Python venv externally.
command -v python >/dev/null 2>&1 || { echo 'python not found'; exit 1; }

# Ensure vllm installed
python - <<'PY'
import importlib, sys
if importlib.util.find_spec('vllm') is None:
    print('vllm not installed. Install with: pip install "vllm>=0.5.0"')
    sys.exit(1)
PY

exec python -m vllm.entrypoints.openai.api_server \
  --model "$MODEL" \
  --port $PORT \
  --max-model-len $CTX \
  --dtype $DTYPE
