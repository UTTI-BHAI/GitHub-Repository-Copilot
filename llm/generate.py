from llm.provider import complete


def generate_answer(prompt):
    """
    Single entry point for LLM calls.

    Provider selection now lives in llm/provider.py and is driven by the
    LLM_PROVIDER environment variable, so switching between Gemini and a
    local Ollama model is config, not code.
    """
    return complete(prompt)