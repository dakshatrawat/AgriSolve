#!/usr/bin/env bash
set -e

pip install --upgrade pip
pip install -r requirements.txt

# Download ML models at build time so they're cached
python -c "
from sentence_transformers import SentenceTransformer, CrossEncoder
print('Downloading embedding model...')
SentenceTransformer('all-MiniLM-L6-v2')
print('Downloading cross-encoder model...')
CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
print('Models ready.')
"
