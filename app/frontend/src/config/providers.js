export const PROVIDERS = [
  {
    id: "openai", name: "OpenAI", tag: "Cloud",
    desc: "GPT-4o, o1, and more from OpenAI.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "sk-..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "gpt-4o" }
    ]
  },
  {
    id: "anthropic", name: "Anthropic", tag: "Cloud",
    desc: "Claude Opus 4, Sonnet 4, and more.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "sk-ant-..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "claude-sonnet-4-6" }
    ]
  },
  {
    id: "gemini", name: "Google Gemini", tag: "Cloud",
    desc: "Gemini 2.0 Flash, Pro and more from Google.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "AIza..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "gemini-2.0-flash" }
    ]
  },
  {
    id: "groq", name: "Groq", tag: "Cloud",
    desc: "Fastest inference for Llama, Mixtral, Gemma.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "gsk_..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "llama-3.3-70b-versatile" }
    ]
  },
  {
    id: "openrouter", name: "OpenRouter", tag: "Cloud",
    desc: "Single API for 200+ models from all providers.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "sk-or-..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "openai/gpt-4o" }
    ]
  },
  {
    id: "deepseek", name: "DeepSeek", tag: "Cloud",
    desc: "DeepSeek V3, R1 reasoning and more.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "sk-..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "deepseek-chat" }
    ]
  },
  {
    id: "mistral", name: "Mistral", tag: "Cloud",
    desc: "Mistral Large, Nemo and open-source models.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "mistral-large-latest" }
    ]
  },
  {
    id: "togetherai", name: "Together AI", tag: "Cloud",
    desc: "100+ open-source models on Together's cloud.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo" }
    ]
  },
  {
    id: "perplexity", name: "Perplexity AI", tag: "Cloud",
    desc: "Internet-connected LLMs with real-time search.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "pplx-..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "llama-3.1-sonar-large-128k-online" }
    ]
  },
  {
    id: "fireworks", name: "Fireworks AI", tag: "Cloud",
    desc: "Production-grade inference for open-source LLMs.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "fw_..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct" }
    ]
  },
  {
    id: "xai", name: "xAI (Grok)", tag: "Cloud",
    desc: "Grok-2 and more from xAI.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "xai-..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "grok-2-latest" }
    ]
  },
  {
    id: "nvidiaNim", name: "NVIDIA NIM", tag: "Cloud",
    desc: "NVIDIA-hosted inference for Llama, Mistral, and more.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "nvapi-..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "meta/llama-3.3-70b-instruct" }
    ]
  },
  {
    id: "sambanova", name: "SambaNova", tag: "Cloud",
    desc: "Ultra-fast inference on SambaNova's AI chips.",
    fields: [
      { key: "llm_api_key", label: "API Key",  type: "password", placeholder: "..." },
      { key: "llm_model",   label: "Model",    type: "model-select", defaultModel: "Meta-Llama-3.3-70B-Instruct" }
    ]
  },
  {
    id: "litellm", name: "LiteLLM", tag: "Custom",
    desc: "LiteLLM proxy — unified interface for 100+ providers.",
    fields: [
      { key: "llm_base_url", label: "LiteLLM URL", type: "url",      placeholder: "http://localhost:4000", defaultValue: "http://localhost:4000" },
      { key: "llm_api_key",  label: "Master Key",  type: "password", placeholder: "sk-..." },
      { key: "llm_model",    label: "Model",        type: "text",     placeholder: "gpt-4o" }
    ]
  },
  {
    id: "azure", name: "Azure OpenAI", tag: "Cloud",
    desc: "Enterprise OpenAI models hosted on Azure.",
    fields: [
      { key: "llm_azure_endpoint",   label: "Endpoint",   type: "url",      placeholder: "https://your-resource.openai.azure.com" },
      { key: "llm_api_key",          label: "API Key",    type: "password",  placeholder: "Azure API key" },
      { key: "llm_azure_deployment", label: "Deployment", type: "text",      placeholder: "my-gpt4o-deployment" },
      { key: "llm_model",            label: "Model name", type: "text",      placeholder: "gpt-4o" }
    ]
  },
  {
    id: "ollama", name: "Ollama", tag: "Local",
    desc: "Run any model locally. Free and private.",
    fields: [
      { key: "llm_base_url", label: "Ollama URL", type: "url",  placeholder: "http://localhost:11434/v1", defaultValue: "http://localhost:11434/v1", triggersModelFetch: true },
      { key: "llm_model",    label: "Model",      type: "model-select", defaultModel: "llama3.2" }
    ]
  },
  {
    id: "lmstudio", name: "LM Studio", tag: "Local",
    desc: "Run models via LM Studio's local server.",
    fields: [
      { key: "llm_base_url", label: "LM Studio URL", type: "url",  placeholder: "http://localhost:1234/v1", defaultValue: "http://localhost:1234/v1" },
      { key: "llm_model",    label: "Model",         type: "text", placeholder: "model-identifier" }
    ]
  },
  {
    id: "generic-openai", name: "Generic OpenAI", tag: "Custom",
    desc: "Connect to any OpenAI-compatible API.",
    fields: [
      { key: "llm_base_url", label: "Base URL", type: "url",      placeholder: "https://your-api.com/v1" },
      { key: "llm_api_key",  label: "API Key",  type: "password",  placeholder: "API key (if required)" },
      { key: "llm_model",    label: "Model",    type: "text",      placeholder: "model-name" }
    ]
  },
];

export const EMBEDDING_PROVIDERS = [
  {
    id: "openai", name: "OpenAI", tag: "Cloud",
    desc: "text-embedding-3 models from OpenAI.",
    fields: [
      { key: "embedding_api_key", label: "API Key", type: "password", placeholder: "sk-..." },
      { key: "embedding_model", label: "Model", type: "select",
        options: ["text-embedding-3-large", "text-embedding-3-small", "text-embedding-ada-002"],
        defaultModel: "text-embedding-3-small" }
    ]
  },
  {
    id: "ollama", name: "Ollama", tag: "Local",
    desc: "Free local embeddings via Ollama.",
    fields: [
      { key: "embedding_base_url", label: "Ollama URL", type: "url",
        placeholder: "http://localhost:11434", defaultValue: "http://localhost:11434" },
      { key: "embedding_model", label: "Model", type: "text",
        placeholder: "nomic-embed-text", defaultValue: "nomic-embed-text" }
    ]
  },
  {
    id: "azure", name: "Azure OpenAI", tag: "Cloud",
    desc: "OpenAI embeddings hosted on Azure.",
    fields: [
      { key: "embedding_azure_endpoint", label: "Endpoint", type: "url",
        placeholder: "https://your-resource.openai.azure.com" },
      { key: "embedding_api_key", label: "API Key", type: "password", placeholder: "Azure API key" },
      { key: "embedding_azure_deployment", label: "Deployment", type: "text",
        placeholder: "my-embedding-deployment" },
      { key: "embedding_model", label: "Model", type: "text",
        placeholder: "text-embedding-3-small", defaultValue: "text-embedding-3-small" }
    ]
  },
  {
    id: "gemini", name: "Google Gemini", tag: "Cloud",
    desc: "Embedding models from Google AI.",
    fields: [
      { key: "embedding_api_key", label: "API Key", type: "password", placeholder: "AIza..." },
      { key: "embedding_model", label: "Model", type: "select",
        options: ["text-embedding-004", "embedding-001"],
        defaultModel: "text-embedding-004" }
    ]
  },
  {
    id: "cohere", name: "Cohere", tag: "Cloud",
    desc: "High-quality multilingual embeddings.",
    fields: [
      { key: "embedding_api_key", label: "API Key", type: "password", placeholder: "..." },
      { key: "embedding_model", label: "Model", type: "select",
        options: ["embed-english-v3.0", "embed-multilingual-v3.0", "embed-english-light-v3.0", "embed-multilingual-light-v3.0"],
        defaultModel: "embed-english-v3.0" }
    ]
  },
  {
    id: "lmstudio", name: "LM Studio", tag: "Local",
    desc: "Run embedding models via LM Studio.",
    fields: [
      { key: "embedding_base_url", label: "LM Studio URL", type: "url",
        placeholder: "http://localhost:1234/v1", defaultValue: "http://localhost:1234/v1" },
      { key: "embedding_model", label: "Model", type: "text",
        placeholder: "nomic-embed-text-v1.5-GGUF" }
    ]
  },
  {
    id: "generic-openai", name: "Generic OpenAI", tag: "Custom",
    desc: "Any OpenAI-compatible embedding endpoint.",
    fields: [
      { key: "embedding_base_url", label: "Base URL", type: "url",
        placeholder: "https://your-api.com/v1" },
      { key: "embedding_api_key", label: "API Key", type: "password", placeholder: "API key (if required)" },
      { key: "embedding_model", label: "Model", type: "text", placeholder: "model-name" }
    ]
  },
];

export const VECTOR_DBS = [
  {
    id: "lancedb", name: "LanceDB", tag: "Local",
    desc: "Embedded local vector DB. Zero setup required.",
    fields: []
  },
  {
    id: "chroma", name: "Chroma", tag: "Local",
    desc: "Open-source vector DB, self-hosted.",
    fields: [
      { key: "vector_db_url", label: "Chroma URL", type: "url",
        placeholder: "http://localhost:8000", defaultValue: "http://localhost:8000" },
      { key: "vector_db_api_key", label: "API Key (optional)", type: "password",
        placeholder: "Leave blank if not required" }
    ]
  },
  {
    id: "pinecone", name: "Pinecone", tag: "Cloud",
    desc: "Fully managed cloud vector database.",
    fields: [
      { key: "vector_db_api_key", label: "API Key", type: "password", placeholder: "pc-..." },
      { key: "vector_db_index", label: "Index Name", type: "text", placeholder: "my-index" },
      { key: "vector_db_environment", label: "Environment", type: "text", placeholder: "us-east1-gcp" }
    ]
  },
  {
    id: "qdrant", name: "Qdrant", tag: "Local",
    desc: "High-performance open-source vector search.",
    fields: [
      { key: "vector_db_url", label: "Qdrant URL", type: "url",
        placeholder: "http://localhost:6333", defaultValue: "http://localhost:6333" },
      { key: "vector_db_api_key", label: "API Key (optional)", type: "password",
        placeholder: "Leave blank if not required" }
    ]
  },
  {
    id: "weaviate", name: "Weaviate", tag: "Cloud",
    desc: "Vector DB with hybrid search capability.",
    fields: [
      { key: "vector_db_url", label: "Weaviate URL", type: "url",
        placeholder: "http://localhost:8080", defaultValue: "http://localhost:8080" },
      { key: "vector_db_api_key", label: "API Key (optional)", type: "password",
        placeholder: "Leave blank if not required" }
    ]
  },
  {
    id: "pgvector", name: "PGVector", tag: "Local",
    desc: "Vector search powered by PostgreSQL.",
    fields: [
      { key: "vector_db_url", label: "Connection URL", type: "text",
        placeholder: "postgresql://user:pass@localhost:5432/dbname" }
    ]
  },
  {
    id: "milvus", name: "Milvus", tag: "Local",
    desc: "Cloud-native vector DB for billion-scale data.",
    fields: [
      { key: "vector_db_url", label: "Milvus URL", type: "url",
        placeholder: "http://localhost:19530", defaultValue: "http://localhost:19530" },
      { key: "vector_db_api_key", label: "API Key (optional)", type: "password",
        placeholder: "Leave blank if not required" }
    ]
  },
  {
    id: "zilliz", name: "Zilliz Cloud", tag: "Cloud",
    desc: "Fully managed Milvus on the cloud.",
    fields: [
      { key: "vector_db_url",     label: "Cluster URL", type: "url",      placeholder: "https://in01-xxx.api.gcp-us-west1.zillizcloud.com" },
      { key: "vector_db_api_key", label: "API Key",     type: "password", placeholder: "..." }
    ]
  },
];

export const TAG_COLOR = {
  Cloud:  "bg-blue-100 text-blue-700",
  Local:  "bg-green-100 text-green-700",
  Custom: "bg-purple-100 text-purple-700",
};
