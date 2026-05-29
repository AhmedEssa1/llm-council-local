# LLM Council CLI

Query multiple AI models from your terminal - just like Claude CLI or OpenClaw!

## 🚀 Quick Start

### 1. Start the Backend
```bash
cd backend
python main.py
```

### 2. Use the CLI

**Windows:**
```cmd
council.bat "What is 2+2?"
```

**Linux/Mac:**
```bash
python council.py "What is 2+2?"
```

## 📚 Basic Usage

### Simple Text Queries
```bash
# Ask a question
council "What is the capital of France?"

# Get help
council --help

# Use specific models
council "Explain quantum computing" --models ollama-gemma4,gemini-local

# Show individual model responses
council "Compare AI models" --show-individual
```

### Image Analysis
```bash
# Analyze one image
council "What's in this image?" --image photo.jpg

# Analyze multiple images (max 3)
council "Compare these two charts" --image chart1.jpg --image chart2.jpg

# Describe a document screenshot
council "Summarize this document" --image doc.png
```

### Advanced Options
```bash
# Specify chairman model
council "Synthesize this" --chairman gemini-local

# Use custom API URL
council "Test query" --api http://192.168.1.100:8000

# Combine multiple options
council "Analyze this" --image photo.jpg --models ollama-gemma4 --show-individual
```

## 🎯 Examples

### Coding Help
```bash
council "Write a Python function to reverse a string"
council "Debug this code: print('hello'" --show-individual
```

### Writing & Content
```bash
council "Write a haiku about artificial intelligence"
council "Summarize the benefits of AI in healthcare"
```

### Analysis & Research
```bash
council "Compare Python vs JavaScript for web development"
council "Explain the main concepts of machine learning"
```

### Image Tasks
```bash
# Image description
council "Describe this image in detail" --image photo.jpg

# Text extraction
council "Extract all text from this image" --image screenshot.png

# Chart analysis
council "What trends do you see in this chart?" --image chart.png
```

## 📊 Output Format

The CLI provides structured output:

```
============================================================
[COUNCIL] LLM COUNCIL RESPONSE
============================================================

[CHAIRMAN] SYNTHESIZED ANSWER:
------------------------------------------------------------
[Final synthesized answer from all models]

============================================================
[MODELS] INDIVIDUAL MODEL RESPONSES:
============================================================

[OK] Gemma 4 (9B)
   [TIME] 1234ms
   [TEXT] [Individual model response...]

============================================================
```

## 🔧 Configuration

### Available Models

Check your available models:
```bash
# View admin panel at http://localhost:5182
# Or check config/council.yaml
```

Default models (if no --models specified):
- All enabled models in config/council.yaml

### Model Selection

```bash
# Single model
--models ollama-gemma4

# Multiple models
--models ollama-gemma4,gemini-local,claude-local

# Use chairman for synthesis
--chairman gemini-local
```

## 🖼️ Image Support

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

### Limits
- Maximum file size: 5MB per image
- Maximum images per query: 3

### Vision Models
Images are only processed by vision-capable models:
- **API Models**: GPT-4V, Claude 3.5 Sonnet (require API keys)
- **Ollama Models**: LLaVA, BakLLaVA, CLLM, MiniCPM, Moondream, Nomic
- **CLI Models**: Images are ignored (text-only response)

## 🌐 Integration Examples

### Shell Scripts
```bash
#!/bin/bash
# Get AI suggestions for git commits
council "Generate a commit message for: changes to user authentication" | tee commit_message.txt

# Analyze log files
council "Analyze this error log" --image error.png > analysis.txt
```

### Batch Processing
```bash
# Process multiple images
for img in *.jpg; do
    echo "Analyzing $img..."
    council "Describe this image" --image "$img" >> results.txt
done
```

### Pipe Usage
```bash
# Use with other commands
echo "What is 42?" | council

# Chain multiple queries
council "List 10 Python libraries" | council "Categorize these by use case"
```

## ⚡ Performance Tips

1. **Use Specific Models**: Faster than querying all models
   ```bash
   council "Quick question" --models ollama-gemma4
   ```

2. **Skip Individual Responses**: Saves bandwidth
   ```bash
   council "Quick answer"  # Don't use --show-individual
   ```

3. **Batch Similar Questions**: Reuse council session
   ```bash
   council "Question 1" &
   council "Question 2" &
   wait
   ```

## 🐛 Troubleshooting

### "Cannot connect to backend"
```bash
# Start the backend
cd backend && python main.py

# Check if running
curl http://localhost:8000/api/health
```

### "Model not responding"
```bash
# Check model availability
curl http://localhost:8000/admin/availability

# Try single model
council "Test" --models ollama-gemma4
```

### "Image too large"
```bash
# Compress image
# Max size: 5MB
convert large.jpg -quality 85 small.jpg
council "Analyze this" --image small.jpg
```

## 📝 Notes

- **Backend Required**: The CLI needs the backend running on `http://localhost:8000`
- **Timeout**: Default 120 seconds per query
- **Concurrent Queries**: You can run multiple CLI instances in parallel
- **Output Format**: Plain text (can be redirected to files)
- **Error Handling**: Clear error messages with recovery suggestions

## 🎨 Comparison with Other CLIs

| Feature | Council CLI | Claude CLI | OpenClaw |
|---------|-------------|------------|----------|
| Multiple Models | ✅ Yes | ❌ No | ❌ No |
| Image Analysis | ✅ Yes | ✅ Yes | ❌ No |
| Synthesis | ✅ Chairman | ❌ No | ❌ No |
| Model Selection | ✅ Custom | ❌ No | ❌ No |
| Vision Support | ✅ Multi-model | ✅ Single | ❌ No |
| Open Source | ✅ Yes | ❌ No | ✅ Yes |

## 🚀 Next Steps

1. **Create Aliases** (optional):
   ```bash
   # Windows (in PowerShell profile)
   function council { python C:\DATA\llm-council-local\council.py $args }

   # Linux/Mac (in .bashrc or .zshrc)
   alias council='python /path/to/council.py'
   ```

2. **Integrate with Tools**:
   - Use in shell scripts
   - Integrate with text editors
   - Create automated workflows

3. **Explore Features**:
   - Try different model combinations
   - Experiment with image analysis
   - Build custom tools on top

---

**Made with ❤️ for the LLM Council project**

For more information, see the main README or visit the web interface at `http://localhost:5182`
